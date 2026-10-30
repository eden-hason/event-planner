import { getEffectiveClient } from '@/lib/supabase/admin';
import { pageAll } from '@/lib/supabase/row-cap';
import {
  CATCH_UP_DELIVERY_SELECT,
  loadCatchUpSchedule,
  toCatchUpDelivery,
} from '../services/catch-up-plan';
import {
  catchUpRejection,
  wentOutAt,
  type CatchUpDeliveryRow,
} from '../utils/catch-up';

export type MissedCatchUpInput = {
  targetStatus: string | null;
  sentAt: string | null;
  deliveries: CatchUpDeliveryRow[];
};

/**
 * What the guest list's "didn't get the latest message" filter (ADR 0050)
 * needs beyond the guests it already has: the Schedule a guest can be caught
 * up on, and its Deliveries. The page runs `missedCatchUpIds` over its own
 * guest list with this, so the list is not read a second time. Null when
 * nothing has gone out, or once the RSVP Cutoff has passed.
 */
export async function getMissedCatchUpInput(
  eventId: string,
): Promise<MissedCatchUpInput | null> {
  const { supabase } = await getEffectiveClient();

  try {
    const schedule = await loadCatchUpSchedule(supabase, eventId);
    if (!schedule) return null;
    const rejection = catchUpRejection({
      status: schedule.status,
      dispatchedAt: schedule.dispatchedAt,
      scheduleTypeKey: schedule.typeKey,
      eventDate: schedule.eventDate,
      now: new Date(),
    });
    if (rejection) return null;

    const deliveries = await pageAll<Parameters<typeof toCatchUpDelivery>[0]>(
      (from, to) =>
        supabase
          .from('message_deliveries')
          .select(CATCH_UP_DELIVERY_SELECT)
          .eq('schedule_id', schedule.id)
          .order('id')
          .range(from, to),
    );
    return {
      targetStatus: schedule.targetStatus,
      sentAt: wentOutAt(schedule),
      deliveries: deliveries.map(toCatchUpDelivery),
    };
  } catch (error) {
    console.error('Error fetching the missed catch-up guests:', error);
    return null;
  }
}
