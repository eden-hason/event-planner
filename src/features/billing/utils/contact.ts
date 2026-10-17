/** Kululu's staffed WhatsApp line, in wa.me form (no + or leading zero). */
export const KULULU_WHATSAPP_NUMBER = '972552639234';

/**
 * The path the Welcome Owner Message's "דברו איתנו" button opens (ADR 0039).
 * Meta will not take a wa.me link in a template button, so the template links
 * here and next.config.ts redirects on to WhatsApp.
 */
export const SUPPORT_PATH = '/support';

/**
 * WhatsApp deep link for billing questions. Checkout happens outside the app,
 * so "unlock sending" is a conversation, not a button that takes money.
 */
export function billingWhatsAppUrl(message: string): string {
  return `https://wa.me/${KULULU_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
