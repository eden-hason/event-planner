/**
 * Generates a unique invitation token using crypto.randomUUID().
 */
export function generateInviteToken(): string {
  return crypto.randomUUID();
}

/**
 * Whether two email addresses belong to the same mailbox. Addresses are
 * case-insensitive in practice (Gmail certainly), and Supabase Auth stores
 * them lowercased, so an invite typed as "Name@gmail.com" must still match.
 */
export function isSameEmail(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Builds the full invitation URL from a token.
 */
export function buildInvitationLink(token: string): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    'http://localhost:3000';
  const origin = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
  return `${origin}/invitations/${token}`;
}

/**
 * Formats a scope summary string like "2 groups · 15 guests"
 */
export function formatScopeSummary(
  groupCount: number,
  guestCount: number,
): string {
  const parts: string[] = [];
  if (groupCount > 0) {
    parts.push(`${groupCount} group${groupCount !== 1 ? 's' : ''}`);
  }
  if (guestCount > 0) {
    parts.push(`${guestCount} guest${guestCount !== 1 ? 's' : ''}`);
  }
  return parts.join(' · ') || 'No scope assigned';
}

/**
 * Returns a human-readable time until expiration.
 */
export function getExpiryText(expiresAt: string): string {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diffMs = expires.getTime() - now.getTime();

  if (diffMs <= 0) return 'Expired';

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d left`;
  if (diffHours > 0) return `${diffHours}h left`;
  return 'Less than 1h left';
}
