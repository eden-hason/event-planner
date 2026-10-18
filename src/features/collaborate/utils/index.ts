/** Query flag Home reads to tell a co-planner they just joined the Event. */
export const JOINED_PARAM = 'joined';

/** Set on the return from sign-in, so the join happens without a second tap. */
export const AUTO_JOIN_PARAM = 'auto';

/** The path a Co-planner Link opens, relative to the site origin. */
export function coPlannerLinkPath(token: string): string {
  return `/join/${encodeURIComponent(token)}`;
}

/** The full Co-planner Link the inviter shares. */
export function buildCoPlannerLink(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, '')}${coPlannerLinkPath(token)}`;
}

/**
 * A wa.me link that opens WhatsApp with `text` ready to send, letting the
 * sender pick the chat. No phone number: the inviter chooses who gets it.
 */
export function buildWhatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
