'use server';

import { getEffectiveClient } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { getCollaboratorAccess } from '@/features/collaborate/queries';
import {
  listEventPayments,
  loadRecordPackage,
  type LoadedRecordPackage,
} from '../services';
import { packageState } from '../utils/record-package';
import { topUpPlan } from '../utils/top-up';
import type { EventBillingStatus, GuestPackageView, RecordPackagePageView } from '../types';

/** What a Top-up needs to know about the Event itself. */
type EventFacts = { billing_status: EventBillingStatus | null; event_date: string | null };

/** The current Event's Record Package and how its guest list sits against it. */
export async function getRecordPackage(eventId: string): Promise<LoadedRecordPackage | null> {
  const { supabase } = await getEffectiveClient();
  return loadRecordPackage(supabase, eventId);
}

/**
 * The package as the Guests page shows it, to the Owner and to collaborators alike.
 *
 * Read with the service client, after the viewer's own client has proven they can see the
 * event, because the payments RLS would hide are creator-only: they carry money. What leaves
 * this function is counts, the channel and record ids, never amounts. Null when the event has no package (free, payment pending).
 */
export async function getGuestPackageView(eventId: string): Promise<GuestPackageView | null> {
  const { supabase } = await getEffectiveClient();
  const { data: event, error } = await supabase
    .from('events')
    .select('billing_status, event_date')
    .eq('id', eventId)
    .maybeSingle<EventFacts>();
  if (error || !event) return null;

  const loaded = await loadRecordPackage(createServiceClient(), eventId);
  return loaded?.package ? toGuestPackageView(loaded, loaded.package, event) : null;
}

function toGuestPackageView(
  loaded: LoadedRecordPackage,
  pkg: NonNullable<LoadedRecordPackage['package']>,
  event: EventFacts,
): GuestPackageView {
  const { used, uncounted, left, over, outside } = loaded.split;
  return {
    paid: pkg.paid,
    bonus: pkg.bonus,
    size: pkg.size,
    used,
    uncounted,
    left,
    over,
    state: packageState(pkg.size, used),
    channel: loaded.channel,
    gifted: loaded.gifted,
    topUpPlan: topUpPlan({
      billingStatus: event.billing_status,
      channel: loaded.channel,
      gifted: loaded.gifted,
      eventDate: event.event_date,
    }),
    outsideIds: outside,
  };
}

/**
 * The Record Package page: the package, how the list sits against it, and every payment.
 *
 * Only for the Event's creator - payments carry amounts, and their RLS lets only
 * `events.user_id` read them, so a co-owner would get a page with the money silently
 * missing. `allowed: false` sends anyone else away; `view: null` is an event with no
 * package yet (free, or a payment still pending).
 */
export async function getRecordPackagePageView(
  eventId: string,
): Promise<{ allowed: false } | { allowed: true; view: RecordPackagePageView | null }> {
  const { supabase } = await getEffectiveClient();
  // Read through RLS, so starting the loads before the access check leaks nothing.
  const [access, eventRes, loaded, payments] = await Promise.all([
    getCollaboratorAccess(eventId),
    supabase
      .from('events')
      .select('billing_status, event_date')
      .eq('id', eventId)
      .maybeSingle<EventFacts>(),
    loadRecordPackage(supabase, eventId),
    listEventPayments(supabase, eventId),
  ]);
  if (!access?.isCreator) return { allowed: false };
  if (!loaded?.package || !payments) return { allowed: true, view: null };

  // Unread, the Event offers no Top-up rather than hiding the package it has.
  const event = eventRes.data ?? { billing_status: null, event_date: null };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the page never reads it
  const { outsideIds, ...counts } = toGuestPackageView(loaded, loaded.package, event);
  return {
    allowed: true,
    view: {
      ...counts,
      bonusIsCustom: loaded.package.bonusIsCustom,
      payments: payments.map((payment) => ({
        id: payment.id,
        records: payment.records,
        channel: payment.channel,
        amount: payment.amount,
        gift: payment.method === 'gift',
        occurredAt: payment.occurredAt,
      })),
    },
  };
}
