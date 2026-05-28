'use server';

import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { ScheduleDbToAppSchema } from '@/features/schedules/schemas';
import type { ScheduleApp } from '@/features/schedules/schemas';
import type { GuestCounts } from '../types';

export type AdminEventDetail = {
  id: string;
  title: string;
  eventDate: string | null;
  status: string;
  ownerEmail: string;
  ownerId: string;
};

export type GuestWithDeliveryStatus = {
  id: string;
  name: string;
  phone: string | null;
  rsvpStatus: 'pending' | 'confirmed' | 'declined';
  createdAt: string;
  hasDelivery: boolean;
};

export async function getAdminEvent(eventId: string): Promise<AdminEventDetail | null> {
  await assertAdmin();
  const supabase = createServiceClient();

  const { data: event, error } = await supabase
    .from('events')
    .select('id, title, event_date, status, user_id')
    .eq('id', eventId)
    .single();

  if (error || !event) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', event.user_id)
    .single();

  return {
    id: event.id,
    title: event.title,
    eventDate: event.event_date,
    status: event.status ?? 'draft',
    ownerEmail: profile?.email ?? '',
    ownerId: event.user_id,
  };
}

export async function getAdminEventSchedules(eventId: string): Promise<ScheduleApp[]> {
  await assertAdmin();
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('event_id', eventId)
    .order('scheduled_date', { ascending: true });

  if (error || !data) return [];

  return data.map((row) => ScheduleDbToAppSchema.parse(row));
}

export async function getGuestCountsForEvent(eventId: string): Promise<GuestCounts> {
  await assertAdmin();
  const supabase = createServiceClient();

  const { data } = await supabase
    .from('guests')
    .select('rsvp_status, is_offline_rsvp, phone_number')
    .eq('event_id', eventId)
    .not('phone_number', 'is', null)
    .neq('phone_number', '');

  const rows = data ?? [];
  const counts: GuestCounts = { pending: 0, confirmed: 0, declined: 0, offlineRsvp: 0, total: 0 };

  for (const row of rows) {
    // Mirror the validatePhoneNumber logic: stripped length >= 7
    const cleaned = (row.phone_number as string).replace(/[^\d+]/g, '');
    if (cleaned.length < 7) continue;

    counts.total++;
    if (row.rsvp_status === 'pending') counts.pending++;
    else if (row.rsvp_status === 'confirmed') counts.confirmed++;
    else if (row.rsvp_status === 'declined') counts.declined++;
    if (row.is_offline_rsvp) counts.offlineRsvp++;
  }

  return counts;
}

export async function getGuestsForManualSend(
  eventId: string,
  scheduleId: string,
): Promise<GuestWithDeliveryStatus[]> {
  await assertAdmin();
  const supabase = createServiceClient();

  const [{ data: guests }, { data: deliveries }] = await Promise.all([
    supabase
      .from('guests')
      .select('id, name, phone_number, rsvp_status, created_at')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false }),
    supabase
      .from('message_deliveries')
      .select('guest_id')
      .eq('schedule_id', scheduleId),
  ]);

  const deliveredSet = new Set((deliveries ?? []).map((d) => d.guest_id));

  const result: GuestWithDeliveryStatus[] = (guests ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    phone: g.phone_number ?? null,
    rsvpStatus: g.rsvp_status as 'pending' | 'confirmed' | 'declined',
    createdAt: g.created_at,
    hasDelivery: deliveredSet.has(g.id),
  }));

  // no-delivery guests first, then already-sent; both groups sorted newest first (already from DB)
  return result.sort((a, b) => {
    if (a.hasDelivery !== b.hasDelivery) return a.hasDelivery ? 1 : -1;
    return 0;
  });
}
