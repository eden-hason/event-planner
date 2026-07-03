'use server';

import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import type { AdminEvent } from '../types';

export async function listAllEvents(userId?: string): Promise<AdminEvent[]> {
  await assertAdmin();
  const supabase = createServiceClient();

  let eventsQuery = supabase
    .from('events')
    .select('id, title, user_id, event_date, status')
    .order('event_date', { ascending: false });

  if (userId) {
    eventsQuery = eventsQuery.eq('user_id', userId);
  }

  const { data: events, error } = await eventsQuery;

  if (error || !events || events.length === 0) {
    if (error) console.error('Error fetching admin events:', error);
    return [];
  }

  const eventIds = events.map((e) => e.id);
  const ownerIds = [...new Set(events.map((e) => e.user_id))];

  // These two lookups are independent, so run them in parallel:
  // owner emails from profiles, and guest counts grouped by event/rsvp_status.
  const [{ data: profiles }, { data: guestRows }] = await Promise.all([
    supabase.from('profiles').select('id, email').in('id', ownerIds),
    supabase.from('guests').select('event_id, rsvp_status').in('event_id', eventIds),
  ]);

  const emailMap = new Map<string, string>(
    (profiles ?? []).map((p) => [p.id, p.email ?? '']),
  );

  const guestMap = new Map<string, { total: number; confirmed: number }>();
  for (const row of guestRows ?? []) {
    const entry = guestMap.get(row.event_id) ?? { total: 0, confirmed: 0 };
    entry.total++;
    if (row.rsvp_status === 'confirmed') entry.confirmed++;
    guestMap.set(row.event_id, entry);
  }

  return events.map((e) => {
    const stats = guestMap.get(e.id) ?? { total: 0, confirmed: 0 };
    return {
      id: e.id,
      title: e.title,
      ownerEmail: emailMap.get(e.user_id) ?? '',
      ownerId: e.user_id,
      eventDate: e.event_date,
      status: e.status ?? 'draft',
      guestCount: stats.total,
      confirmedCount: stats.confirmed,
      rsvpPercent:
        stats.total > 0 ? Math.round((stats.confirmed / stats.total) * 100) : 0,
    };
  });
}
