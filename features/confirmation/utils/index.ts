import { randomBytes } from 'crypto';

/**
 * Generates a cryptographically random 32-byte hex token
 * for use as a confirmation_token in message_deliveries.
 */
export function generateConfirmationToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Builds the full confirmation URL for a given token.
 * Uses NEXT_PUBLIC_SITE_URL in production, falls back to localhost.
 */
export function buildConfirmationUrl(token: string): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : 'http://localhost:3000');

  return `${baseUrl}/c/${token}`;
}
