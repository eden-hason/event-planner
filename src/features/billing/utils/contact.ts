import { KULULU_WHATSAPP_NUMBER } from '@/lib/config/contact';

/**
 * WhatsApp deep link for billing questions. Checkout happens outside the app,
 * so "unlock sending" is a conversation, not a button that takes money.
 */
export function billingWhatsAppUrl(message: string): string {
  return `https://wa.me/${KULULU_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
