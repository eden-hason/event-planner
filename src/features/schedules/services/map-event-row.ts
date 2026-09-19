/**
 * Maps a joined `events` row (snake_case) to the shape the parameter resolvers
 * read.
 *
 * Lives on its own because both the Dispatcher and the SMS Fallback need it and
 * neither owns the other. It was previously a named export of the send engine,
 * which is exactly the kind of incidental coupling that made that engine
 * impossible to split.
 *
 * Callers select `event_types (key)` alongside the event columns, which is what
 * the Occasion Phrase is built from.
 */

// Deep import: the events barrel carries Server Actions, and this module runs in
// the send path and its tests.
import {
  buildApproachingLine,
  buildOccasionPhrase,
  buildTodayLine,
  readEventTypeKey,
} from '@/features/events/utils/event-title';

export function mapEventRow(rawEvent: Record<string, unknown>) {
  const invitations = rawEvent.invitations as Record<string, string> | null;
  const settings = rawEvent.event_settings as {
    // Optional `link` on both: a half-configured row, or a legacy Bit row that
    // still holds `phoneNumber` and no `link`. `isGiftingEnabled` treats a
    // missing link as "not configured".
    paybox_config?: { enabled: boolean; link?: string };
    bit_config?: { enabled: boolean; link?: string };
    gift_buttons?: Partial<Record<string, boolean>>;
  } | null;
  const guestExperience = rawEvent.guests_experience as {
    send_table_numbers?: boolean;
  } | null;
  const hostDetails =
    (rawEvent.host_details as Record<string, unknown> | null) ?? undefined;
  return {
    id: rawEvent.id as string,
    userId: rawEvent.user_id as string,
    title: rawEvent.title as string,
    // "חתונה של נועה ודורון" - the one placeholder that makes a Template fit
    // every event type (see confirmation_1). Null when it cannot be built,
    // which fails the render rather than sending "הוזמנתם ל" and nothing.
    occasionPhrase: buildOccasionPhrase({
      eventTypeKey: readEventTypeKey(rawEvent.event_types),
      hostDetails,
    }),
    // "החתונה של נועה ודורון מתקרבת" - the follow-up round's opening line.
    approachingLine: buildApproachingLine({
      eventTypeKey: readEventTypeKey(rawEvent.event_types),
      hostDetails,
    }),
    // "החתונה של נועה ודורון מתקיימת היום" - the Event Reminder's opening line.
    todayLine: buildTodayLine({
      eventTypeKey: readEventTypeKey(rawEvent.event_types),
      hostDetails,
    }),
    // Null for an event with no date. Such an event cannot have schedules -
    // every offset is relative to the date - so this engine should never see
    // one, but the column is nullable and the type says so.
    eventDate: rawEvent.event_date as string | null,
    location:
      (rawEvent.location as {
        name: string;
        coords?: { lat: number; lng: number };
      } | null) ?? undefined,
    hostDetails,
    invitations: invitations
      ? { imageUrl: invitations.image_url }
      : undefined,
    receptionTime: (rawEvent.reception_time as string | null) ?? undefined,
    shortCode: (rawEvent.short_code as string | null) ?? undefined,
    // Read by the template resolver, not by any placeholder.
    eventSettings: settings
      ? {
          payboxConfig: settings.paybox_config,
          bitConfig: settings.bit_config,
          giftButtons: settings.gift_buttons,
        }
      : undefined,
    guestExperience: guestExperience
      ? { sendTableNumbers: guestExperience.send_table_numbers }
      : undefined,
  };
}
