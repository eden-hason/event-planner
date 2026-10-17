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

/**
 * Where Kululu asks for a Google review: the Business Profile's "Ask for
 * reviews" link, which opens the review form directly. The Post-event Owner
 * Message links REVIEW_PATH as plain text (a body link opens in the phone's own
 * browser, a button in WhatsApp's), and next.config.ts redirects it here.
 */
export const GOOGLE_REVIEW_URL = 'https://g.page/r/CdLdsV8gjwUVEAI/review';

/** The short link the Post-event Owner Message shows for the review. */
export const REVIEW_PATH = '/review';
