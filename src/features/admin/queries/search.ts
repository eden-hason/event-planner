'use server';

import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import type { EventSearchResult } from '../types';

/**
 * Enough rows to recognise the one you meant, few enough to scan without
 * scrolling. The Operator refines the term rather than pages through results.
 */
const SEARCH_LIMIT = 8;
const MIN_TERM_LENGTH = 2;

/** PostgREST treats these as pattern syntax, so a raw title would over-match. */
function escapeLike(term: string): string {
  return term.replace(/[%_\\]/g, (char) => `\\${char}`);
}

/**
 * Header search: event title, owner name, or owner email, straight to the event
 * workspace. It exists so an event with no planned work is still reachable -
 * the Operations queue only lists events that have something outstanding.
 *
 * Draft Events are included and labelled. They are excluded from business
 * counts because a Draft Event is interest rather than an event, but that is an
 * argument about arithmetic, not about reachability: an Operator searching for
 * one by name should find it rather than conclude it does not exist.
 */
export async function searchEvents(term: string): Promise<EventSearchResult[]> {
  await assertAdmin();

  const trimmed = term.trim();
  if (trimmed.length < MIN_TERM_LENGTH) return [];

  const supabase = createServiceClient();
  const pattern = `%${escapeLike(trimmed)}%`;

  // events.user_id points at auth.users and there is no foreign key to
  // profiles, so the owner cannot be embedded or filtered on in one query.
  // Owners are resolved to ids first, then merged back by user_id.
  const { data: owners, error: ownersError } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .or(`full_name.ilike.${pattern},email.ilike.${pattern}`);

  if (ownersError) throw new Error(ownersError.message);

  const matchedOwnerIds = (owners ?? []).map((owner) => owner.id);

  const filters = [`title.ilike.${pattern}`];
  if (matchedOwnerIds.length) {
    filters.push(`user_id.in.(${matchedOwnerIds.join(',')})`);
  }

  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, title, event_date, user_id, status')
    .or(filters.join(','))
    .order('event_date', { ascending: true })
    .limit(SEARCH_LIMIT);

  if (eventsError) throw new Error(eventsError.message);
  if (!events?.length) return [];

  // The owner of a title match is not necessarily among the owners matched
  // above, so resolve the full result set rather than reusing that list.
  const { data: resultOwners, error: resultOwnersError } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in(
      'id',
      events.map((event) => event.user_id),
    );

  if (resultOwnersError) throw new Error(resultOwnersError.message);

  const ownerById = new Map((resultOwners ?? []).map((owner) => [owner.id, owner]));

  return events.map((event) => {
    const owner = ownerById.get(event.user_id);

    return {
      id: event.id,
      title: event.title ?? 'Untitled event',
      eventDate: event.event_date,
      isDraft: event.status === 'draft',
      ownerName: owner?.full_name || owner?.email || 'Unknown owner',
      ownerEmail: owner?.email ?? null,
    };
  });
}
