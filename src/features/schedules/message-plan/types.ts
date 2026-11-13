import type { GiftingSettings } from '../utils/event-config';
import type { Attachment, Wording } from './shape';

/**
 * The Event as the Message Plan's messages read it. Structurally the output of
 * `mapEventRow` (services/map-event-row.ts) plus two facts it does not map yet:
 * `eventTypeKey` (the hosts Message Field needs the type to know whose names
 * to read) and `ceremonyTime`. Phase 3 adds both to the mapped Event.
 */
export type MessagePlanEvent = {
  eventTypeKey?: string | null;
  hostDetails?: Record<string, unknown> | null;
  /** "חתונה של נועה ודורון", null when it cannot be built. */
  occasionPhrase: string | null;
  /** "החתונה של נועה ודורון מתקרבת" */
  approachingLine: string | null;
  /** "החתונה של נועה ודורון מתקיימת היום" */
  todayLine: string | null;
  /** A calendar date stored at 00:00 UTC. */
  eventDate: string | null;
  location?: { name: string } | null;
  receptionTime?: string | null;
  ceremonyTime?: string | null;
  shortCode?: string | null;
  invitations?: { imageUrl?: string } | null;
  invitationVideoUrl?: string | null;
  eventSettings?: GiftingSettings;
  /** The Event's "send table numbers" switch. Off means no Guest is sent a table. */
  guestExperience?: { sendTableNumbers?: boolean } | null;
};

export type MessagePlanGuestTable = {
  tableNumber: number;
  label?: string | null;
};

/** One Guest Record as its message reads it. */
export type MessagePlanGuest = {
  /** The name exactly as written in the guest list. */
  name: string;
  phone?: string | null;
  /** The Guest's seating assignment, null when they have none. */
  table: MessagePlanGuestTable | null;
};

/**
 * What a Schedule on the current plan chose, as stored on `schedules`
 * (migration 20261113000000_message_plan.sql). Read as stored: any of it may
 * be stale, and the renderer falls back rather than trusting it.
 */
export type MessagePlanSchedule = {
  /** The Schedule Type key: invitation, follow_up, event_reminder or post_event. */
  scheduleTypeKey: string;
  wording: Wording | null;
  personalText: string | null;
  /** Asks only; null on the Reminder and the Thank You. */
  attachment: Attachment | null;
  /** Reminder and Thank You only; null on the Asks. */
  giftButton: boolean | null;
  /** The Due Time, an ISO instant. The Reminder's wording follows its day. */
  scheduledFor: string | null;
};

/**
 * The public links a Guest's message points at, built by the caller (the
 * site's base URL is configuration, which this pure code does not read). See
 * `buildMessageLinks`.
 */
export type MessageLinks = {
  /** The Guest's own RSVP page, `/c/<token>`. Asks only. */
  rsvp: string | null;
  /** `/nav/<short code>`, where the WhatsApp navigation button goes. */
  navigation: string | null;
  /** `/r/<short code>`, where the WhatsApp gift button goes. */
  gift: string | null;
};
