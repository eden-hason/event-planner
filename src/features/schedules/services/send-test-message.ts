import type { SupabaseClient } from '@supabase/supabase-js';
import { SCHEDULE_SELECT, ScheduleDbToAppSchema } from '../schemas';
import { toWhatsAppTemplate, type MessageTemplateApp } from '../schemas/message-templates';
import type { GuestApp } from '@/features/guests/schemas';
import {
  isGiftingEnabled,
  hasInvitationImage,
  isMessageSchedule,
  sendSmsToGuest,
  sendToGuest,
  shouldSendTableNumbers,
  type GuestSendResult,
  type ParameterResolutionContext,
} from '../utils';
import { mapEventRow } from './map-event-row';
import { resolveTemplatesForEvent } from './resolve-reminder-templates';
import { missingOccasionPhrase } from '../utils/send-payload';
import { loadIsFollowUpConfirmation } from './confirmation-round';

/** Accepted Test Messages an event may send over its whole life. */
export const TEST_MESSAGE_CAP = 3;

export type SendTestMessageOutcome =
  | { success: true; phone: string }
  | {
      success: false;
      reason: 'cap-reached' | 'not-found' | 'send-failed';
      message: string;
    };

/**
 * Sends a copy of a Schedule's message to the Owner's own phone (see Test
 * Message in CONTEXT.md).
 *
 * The recipient stands in for a Guest only inside parameter resolution: no
 * Guest Record is read or written, nothing lands in message_deliveries, and
 * the RSVP link carries the event's preview token, so tapping it opens the
 * preview page instead of answering for anyone. The send is logged in
 * test_messages, which is also what enforces TEST_MESSAGE_CAP.
 *
 * Expects a service-role client: the caller has already checked that the
 * viewer owns the event.
 */
export async function sendTestMessage(params: {
  supabase: SupabaseClient;
  scheduleId: string;
  recipient: { userId: string; name: string; phone: string };
}): Promise<SendTestMessageOutcome> {
  const { supabase, scheduleId, recipient } = params;

  const { data: rawSchedule, error: scheduleError } = await supabase
    .from('schedules')
    .select(
      `${SCHEDULE_SELECT},
       events (id, user_id, title, event_date, location, host_details,
               invitations, reception_time, short_code, event_settings,
               guests_experience, preview_token, event_types (key))`,
    )
    .eq('id', scheduleId)
    .single();

  if (scheduleError || !rawSchedule?.events) {
    return { success: false, reason: 'not-found', message: 'Schedule not found' };
  }

  const schedule = ScheduleDbToAppSchema.parse(rawSchedule);
  const rawEvent = rawSchedule.events as unknown as Record<string, unknown>;
  const event = mapEventRow(rawEvent);
  const previewToken = rawEvent.preview_token as string;

  if (!isMessageSchedule(schedule) || !schedule.template) {
    return { success: false, reason: 'not-found', message: 'Schedule has no message to test' };
  }

  const resolution = await resolveTemplatesForEvent({
    supabase,
    anchor: schedule.template,
    gifting: isGiftingEnabled(event.eventSettings),
    tableNumbers: shouldSendTableNumbers(event.guestExperience),
    note: Boolean(schedule.customText?.trim()),
    followUp: await loadIsFollowUpConfirmation(supabase, schedule),
    invitationImage: hasInvitationImage(event.invitations),
  });
  if (!resolution.success) {
    return { success: false, reason: 'send-failed', message: resolution.message };
  }

  // Checked before a send is reserved, so a message that could never go out
  // does not spend one of the Event's three Test Messages.
  const missing = missingOccasionPhrase(resolution.templates.withoutTable, {
    guest: { id: 'test' } as GuestApp,
    event,
  });
  if (missing) {
    return { success: false, reason: 'send-failed', message: missing };
  }

  const { data: reservationId, error: reserveError } = await supabase.rpc(
    'reserve_test_message',
    {
      p_event_id: schedule.eventId,
      p_user_id: recipient.userId,
      p_schedule_id: scheduleId,
      p_phone_number: recipient.phone,
      p_cap: TEST_MESSAGE_CAP,
    },
  );
  if (reserveError) {
    console.error('[send-test-message] Could not reserve a test send:', reserveError);
    return { success: false, reason: 'send-failed', message: 'Could not send the test message' };
  }
  if (!reservationId) {
    return { success: false, reason: 'cap-reached', message: 'Test message limit reached' };
  }

  const now = new Date().toISOString();
  const guest: GuestApp = {
    id: reservationId as string,
    eventId: schedule.eventId,
    name: recipient.name,
    phone: recipient.phone,
    groupId: null,
    rsvpStatus: 'pending',
    mealCounts: {},
    amount: 1,
    tableId: null,
    createdAt: now,
    updatedAt: now,
    invitationToken: previewToken,
  };

  // The table-number variant needs a real seating assignment; the Owner has none.
  const template: MessageTemplateApp = resolution.templates.withoutTable;
  const context: ParameterResolutionContext = {
    guest,
    event,
    group: null,
    table: null,
    schedule,
    confirmationToken: previewToken,
  };

  let result: GuestSendResult;
  try {
    result =
      template.channel === 'sms'
        ? await sendSmsToGuest({
            guest,
            context,
            smsPayload: template.payload,
            templateId: template.id,
            confirmationToken: previewToken,
          })
        : await sendToGuest({
            guest,
            context,
            template: toWhatsAppTemplate(template)!,
            templateId: template.id,
            confirmationToken: previewToken,
          });
  } catch (error) {
    result = {
      guest,
      success: false,
      message: error instanceof Error ? error.message : 'Send failed',
      channel: template.channel,
      confirmationToken: previewToken,
      templateId: template.id,
    };
  }

  const { error: updateError } = await supabase
    .from('test_messages')
    .update({
      status: result.success ? 'accepted' : 'failed',
      external_message_id: result.messageId ?? null,
      error_message: result.success ? null : result.message,
    })
    .eq('id', reservationId);
  if (updateError) {
    console.error('[send-test-message] Could not record the outcome:', updateError);
  }

  if (!result.success) {
    console.error('[send-test-message] Provider rejected the send:', result.message);
    return { success: false, reason: 'send-failed', message: 'Could not send the test message' };
  }

  return { success: true, phone: recipient.phone };
}
