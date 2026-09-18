/**
 * Predicates that turn an event's configuration into the template axes a
 * reminder is resolved on. Pure and structurally typed so the send path (which
 * maps a raw joined row) and the preview path (which holds an EventApp) can
 * both call them without agreeing on a full event shape.
 */

export type GiftingSettings =
  | {
      // `link` is optional on both providers so a half-configured or legacy row
      // (Bit rows still holding `phoneNumber` and no `link`) reads as "not
      // configured" rather than crashing on `.trim()`.
      payboxConfig?: { enabled: boolean; link?: string };
      bitConfig?: { enabled: boolean; link?: string };
    }
  | null
  | undefined;

/**
 * Whether the reminder copy should mention gifting alongside navigation.
 *
 * A provider counts only when it is both enabled *and* configured: the toggle
 * and its value are separate fields, and an enabled provider with an empty
 * link would send guests to a reminder page with a button that goes nowhere.
 */
export function isGiftingEnabled(settings: GiftingSettings): boolean {
  if (!settings) return false;

  const paybox = settings.payboxConfig;
  const bit = settings.bitConfig;

  return Boolean(
    (paybox?.enabled && paybox.link?.trim()) ||
      (bit?.enabled && bit.link?.trim()),
  );
}

export type TableNumberSettings =
  | { sendTableNumbers?: boolean }
  | null
  | undefined;

/**
 * Whether the event opted into putting table numbers in the reminder. This is
 * only the event-level gate - whether a *given* guest gets the table variant
 * additionally depends on them having a seating assignment.
 */
export function shouldSendTableNumbers(
  guestExperience: TableNumberSettings,
): boolean {
  return guestExperience?.sendTableNumbers === true;
}

export type InvitationSettings = { imageUrl?: string } | null | undefined;

/**
 * Whether the Event has an invitation image that can go in a template's image
 * header. Judged the way the header builder judges it - a parseable URL - so
 * the resolver never picks the image row for a value the header would drop,
 * which Meta rejects for a template approved with an image header.
 */
export function hasInvitationImage(invitations: InvitationSettings): boolean {
  const url = invitations?.imageUrl?.trim();
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
