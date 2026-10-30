import type { SupabaseClient } from '@supabase/supabase-js';
import { SCHEDULE_SELECT, ScheduleDbToAppSchema } from '../schemas';
import { toWhatsAppTemplate, type WhatsAppTemplateApp } from '../schemas/message-templates';
import type { GuestApp } from '@/features/guests/schemas';
import {
  includesGiftButton,
  hasInvitationImage,
  hasNote,
  isMessageSchedule,
  shouldSendTableNumbers,
  type ParameterResolutionContext,
} from '../utils';
import {
  buildDynamicButtonParameters,
  buildDynamicHeaderParameters,
  buildDynamicTemplateParameters,
} from '../utils/parameter-resolvers';
import { buildWhatsAppComponents } from '../utils/send-payload';
import { TEST_MESSAGE_TAG } from '../utils/whatsapp-callback-tag';
import { mapEventRow } from './map-event-row';
import { postWhatsAppTemplate, type WhatsAppSendResult } from './post-whatsapp';
import { resolveTemplatesForSchedule } from './resolve-reminder-templates';
import { missingOccasionPhrase } from '../utils/send-payload';
import { loadIsFollowUpConfirmation } from './confirmation-round';

/** Accepted Test Messages an event may send over its whole life. */
export const TEST_MESSAGE_CAP = 3;

/** Accepted Test Messages an account may send across all its Events (ADR 0047). */
export const TEST_MESSAGE_ACCOUNT_CAP = 3;

export type SendTestMessageOutcome =
  | { success: true; phone: string }
  | {
      success: false;
      reason: 'cap-reached' | 'not-found' | 'send-failed';
      message: string;
    };

/**
 * Sends a copy of a Schedule's message to the Owner's own phone (see Test
 * Message in CONTEXT.md). Always by WhatsApp: a Schedule whose template is an
 * SMS is tested with the WhatsApp member of the same family.
 *
 * The recipient stands in for a Guest only inside parameter resolution: no
 * Guest Record is read or written, nothing lands in message_deliveries, and
 * the RSVP link and the buttons carry the event's preview token, so tapping
 * them plays the conversation out without answering for anyone. The send is
 * logged in test_messages, which is also what enforces the caps.
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
               invitations, invitation_video_url, reception_time, short_code, event_settings,
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

  const resolution = await resolveTemplatesForSchedule({
    supabase,
    anchor: schedule.template,
    personalMessage: schedule.personalMessage,
    channel: 'whatsapp',
    gifting: includesGiftButton(event.eventSettings, schedule.scheduleTypeKey),
    tableNumbers: shouldSendTableNumbers(event.guestExperience),
    note: hasNote(schedule.customText),
    followUp: await loadIsFollowUpConfirmation(supabase, schedule),
    invitationImage: hasInvitationImage(event.invitations),
  });
  if (!resolution.success) {
    return { success: false, reason: 'send-failed', message: resolution.message };
  }

  // The table-number variant needs a real seating assignment; the Owner has none.
  const template = toWhatsAppTemplate(resolution.templates.withoutTable);
  if (!template) {
    return { success: false, reason: 'send-failed', message: 'No WhatsApp template to test' };
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
      p_account_cap: TEST_MESSAGE_ACCOUNT_CAP,
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

  const context: ParameterResolutionContext = {
    guest,
    event,
    group: null,
    table: null,
    schedule,
    confirmationToken: previewToken,
  };

  let result: WhatsAppSendResult;
  try {
    result = await postTestTemplate(recipient.phone, template, context);
  } catch (error) {
    result = {
      outcome: 'unknown',
      message: error instanceof Error ? error.message : 'Send failed',
    };
  }
  const accepted = result.outcome === 'accepted';

  const { error: updateError } = await supabase
    .from('test_messages')
    .update({
      status: accepted ? 'accepted' : 'failed',
      external_message_id: result.outcome === 'accepted' ? result.messageId : null,
      error_message: result.outcome === 'accepted' ? null : result.message,
    })
    .eq('id', reservationId);
  if (updateError) {
    console.error('[send-test-message] Could not record the outcome:', updateError);
  }

  if (result.outcome !== 'accepted') {
    console.error('[send-test-message] Provider did not accept the send:', result.message);
    return { success: false, reason: 'send-failed', message: 'Could not send the test message' };
  }

  return { success: true, phone: recipient.phone };
}

/**
 * Renders the template for the Owner and posts it, tagged as a test so the
 * webhook knows its statuses touch no Delivery (ADR 0019). There is no Delivery
 * and no retry here, so a rejection and an unknown outcome end the same way.
 */
function postTestTemplate(
  to: string,
  template: WhatsAppTemplateApp,
  context: ParameterResolutionContext,
): Promise<WhatsAppSendResult> {
  const placeholders = template.parameters;
  return postWhatsAppTemplate(
    {
      channel: 'whatsapp',
      to,
      templateName: template.templateName,
      languageCode: template.languageCode,
      components: buildWhatsAppComponents({
        parameters: buildDynamicTemplateParameters(placeholders?.placeholders ?? [], context),
        headerParameters: placeholders?.headerPlaceholders?.length
          ? buildDynamicHeaderParameters(placeholders.headerPlaceholders, context)
          : undefined,
        buttonParameters: placeholders?.buttonPlaceholders?.length
          ? buildDynamicButtonParameters(placeholders.buttonPlaceholders, context)
          : undefined,
      }),
    },
    TEST_MESSAGE_TAG,
  );
}
