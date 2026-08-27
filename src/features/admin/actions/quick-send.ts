'use server';

import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { revalidateOutreach } from '@/features/schedules/services/revalidate-outreach';
import { sendSchedule } from '@/features/schedules/services/send-schedule';
import { gateScheduleForSend } from '../services/schedule-send-gate';

export type QuickSendGuest = {
  id: string;
  name: string;
  phone: string | null;
  rsvpStatus: string;
  groupName: string | null;
  /** Already received this schedule - the Operator is about to send it twice. */
  alreadySent: boolean;
};

export type QuickSendResult = { success: boolean; message: string };

/**
 * The guest list behind the quick-send picker, fetched when the dialog opens
 * rather than shipped with the page - a full guest list on every workspace
 * render is a large RSC payload nobody asked for.
 *
 * Guests without a usable phone are returned rather than filtered out: an
 * Operator looking for someone and not finding them has no way to tell a
 * missing guest from an unreachable one, so the picker shows them disabled.
 */
export async function getQuickSendGuests(
  scheduleId: string,
): Promise<QuickSendGuest[]> {
  await assertAdmin();
  const supabase = createServiceClient();

  const gate = await gateScheduleForSend(supabase, scheduleId);
  if (!gate.ok) return [];

  const [guestsResult, deliveriesResult] = await Promise.all([
    supabase
      .from('guests')
      .select('id, name, phone_number, rsvp_status, groups(name)')
      .eq('event_id', gate.gate.eventId)
      .order('name', { ascending: true }),
    supabase
      .from('message_deliveries')
      .select('guest_id')
      .eq('schedule_id', scheduleId)
      .in('status', ['sent', 'delivered', 'read']),
  ]);
  if (guestsResult.error) throw guestsResult.error;
  if (deliveriesResult.error) throw deliveriesResult.error;

  const delivered = new Set(
    (deliveriesResult.data ?? []).map((row) => row.guest_id),
  );

  return (guestsResult.data ?? []).map((guest) => {
    const group = (Array.isArray(guest.groups) ? guest.groups[0] : guest.groups) as
      | { name: string }
      | null;
    return {
      id: guest.id,
      name: guest.name,
      phone: guest.phone_number,
      rsvpStatus: guest.rsvp_status,
      groupName: group?.name ?? null,
      alreadySent: delivered.has(guest.id),
    };
  });
}

/**
 * Sends one schedule's message to one guest, now.
 *
 * Deliberately indifferent to the schedule's own status and target audience:
 * this is the Operator picking a person on the phone who never got the message
 * or lost it, so `claim: 'none'` skips the sent/cancelled guard and
 * `markSentOnSuccess: false` leaves a still-pending schedule pending for the
 * cron to run on its own date.
 */
export async function sendScheduleToGuest(
  scheduleId: string,
  guestId: string,
): Promise<QuickSendResult> {
  await assertAdmin();
  const supabase = createServiceClient();

  try {
    const gate = await gateScheduleForSend(supabase, scheduleId);
    if (!gate.ok) return { success: false, message: gate.message };

    // Scoped to the event the schedule belongs to, so a guest id from another
    // event cannot be sent someone else's message.
    const { data: guest, error: guestError } = await supabase
      .from('guests')
      .select('id, name')
      .eq('id', guestId)
      .eq('event_id', gate.gate.eventId)
      .maybeSingle();
    if (guestError) throw guestError;
    if (!guest) {
      return { success: false, message: 'That guest is not on this event' };
    }

    const outcome = await sendSchedule(scheduleId, {
      supabase,
      triggeredBy: 'manual',
      claim: 'none',
      guestIds: [guestId],
      markSentOnSuccess: false,
    });

    revalidateOutreach(gate.gate.eventId);

    if (!outcome.success) {
      return {
        success: false,
        message:
          outcome.message === 'No guests with valid phone numbers'
            ? `${guest.name} has no usable phone number`
            : outcome.message,
      };
    }

    return { success: true, message: `Sent to ${guest.name}` };
  } catch (error) {
    console.error('sendScheduleToGuest failed:', error);
    return { success: false, message: 'Failed to send the message' };
  }
}
