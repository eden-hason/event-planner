import { getEffectiveClient } from '@/lib/supabase/admin';
import { pageAll } from '@/lib/supabase/row-cap';
import {
  CATCH_UP_TYPE_KEYS,
  catchUpRejection,
  pickCatchUpSchedule,
} from '../utils/catch-up';

type ScheduleRow = {
  id: string;
  status: string | null;
  target_status: string | null;
  sent_at: string | null;
  dispatched_at: string | null;
  schedule_types: { key: string } | { key: string }[] | null;
  events:
    | { event_date: string | null }
    | { event_date: string | null }[]
    | null;
};

/**
 * Guest Records that missed the latest Initial Invitation or Confirmation that
 * went out (pickCatchUpSchedule): in its audience today, with no Delivery for it
 * or a Not sent one. The guest list's "didn't get the latest message" filter (ADR 0050) - the guests a Catch-up Send is
 * for, including those who cannot be sent it yet (no phone, outside the
 * package), whose drawer says why. Empty once the RSVP Cutoff has passed.
 */
export async function getMissedCatchUpGuestIds(
  eventId: string,
): Promise<string[]> {
  const { supabase } = await getEffectiveClient();

  const { data, error } = await supabase
    .from('schedules')
    .select(
      'id, status, target_status, sent_at, dispatched_at, schedule_types!inner(key), events!inner(event_date)',
    )
    .eq('event_id', eventId)
    .in('schedule_types.key', [...CATCH_UP_TYPE_KEYS]);
  if (error) {
    console.error('Error fetching Schedules for the missed filter:', error);
    return [];
  }

  const rows = (data ?? []) as unknown as ScheduleRow[];
  const one = <T>(value: T | T[] | null) =>
    Array.isArray(value) ? (value[0] ?? null) : value;
  const latest = pickCatchUpSchedule(
    rows.map((row) => ({
      id: row.id,
      typeKey: one(row.schedule_types)?.key ?? '',
      status: row.status,
      sentAt: row.sent_at,
      dispatchedAt: row.dispatched_at,
      targetStatus: row.target_status,
      eventDate: one(row.events)?.event_date ?? null,
    })),
  );
  if (!latest) return [];
  const rejection = catchUpRejection({
    status: latest.status,
    dispatchedAt: latest.dispatchedAt,
    scheduleTypeKey: latest.typeKey,
    eventDate: latest.eventDate,
    now: new Date(),
  });
  if (rejection) return [];

  try {
    const [guests, deliveries] = await Promise.all([
      pageAll<{ id: string }>((from, to) => {
        let query = supabase
          .from('guests')
          .select('id')
          .eq('event_id', eventId);
        if (latest.targetStatus)
          query = query.eq('rsvp_status', latest.targetStatus);
        return query.order('id').range(from, to);
      }),
      pageAll<{ guest_id: string; status: string }>((from, to) =>
        supabase
          .from('message_deliveries')
          .select('guest_id, status')
          .eq('schedule_id', latest.id)
          .order('id')
          .range(from, to),
      ),
    ]);
    const got = new Set(
      deliveries
        .filter((row) => row.status !== 'not_sent')
        .map((row) => row.guest_id),
    );
    return guests.map((guest) => guest.id).filter((id) => !got.has(id));
  } catch (error) {
    console.error('Error fetching the missed catch-up guests:', error);
    return [];
  }
}
