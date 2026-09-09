const WHATSAPP_NUMBER = '972552639234';

/**
 * WhatsApp deep link for billing questions. Checkout happens outside the app,
 * so "unlock sending" is a conversation, not a button that takes money.
 */
export function billingWhatsAppUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
