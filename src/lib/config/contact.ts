/**
 * How people reach Kululu. Plain constants with no imports, because
 * next.config.ts reads them at build time.
 */

/** Kululu's staffed WhatsApp line, in wa.me form (no + or leading zero). */
export const KULULU_WHATSAPP_NUMBER = '972552639234';

/**
 * The path the Welcome Owner Message's "דברו איתנו" button opens (ADR 0039).
 * Meta will not take a wa.me link in a template button, so the template links
 * here and next.config.ts redirects on to WhatsApp.
 */
export const SUPPORT_PATH = '/support';
