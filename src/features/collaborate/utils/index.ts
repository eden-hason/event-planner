/**
 * Set by the join for one Home render, so the co-planner is told they joined
 * (ADR 0041). Read and cleared by the browser, like the Visitor-dropped flag.
 */
export const JOINED_COOKIE = 'kululu_co_planner_joined';

/** The path a Co-planner Link opens, relative to the site origin. */
export function coPlannerLinkPath(token: string): string {
  return `/join/${encodeURIComponent(token)}`;
}

/** Where the link's page sends someone to be joined, after sign-in if needed. */
export function coPlannerAcceptPath(token: string): string {
  return `${coPlannerLinkPath(token)}/accept`;
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
