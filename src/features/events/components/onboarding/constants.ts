/**
 * The onboarding takeover speaks the marketing homepage's visual language, then
 * resolves into the app's design system at the dashboard. The couple has just
 * come from the homepage, so the takeover reads as its continuation and the
 * brand never drops; the shift to app chrome afterwards becomes the "you have
 * arrived" signal rather than a jarring seam.
 *
 * These are the marketing values, set as CSS custom properties on the takeover
 * shell so they cannot leak into the rest of the app.
 */
export const TAKEOVER_TOKENS = {
  '--kt-brand': '#D23CC2',
  '--kt-brand-deep': '#B92AAB',
  '--kt-violet': '#7F5AF0',
  '--kt-violet-soft': '#A78BFA',
  '--kt-ink': '#1A0B2E',
  '--kt-ink-muted': '#4B3A63',
  '--kt-ink-faint': '#8A7AA0',
  '--kt-ink-ghost': '#B9AECB',
  '--kt-surface': '#FAFAFA',
  '--kt-card': '#FFFFFF',
  '--kt-border': 'rgba(26,11,46,0.1)',
  '--kt-border-soft': 'rgba(26,11,46,0.08)',
  '--kt-disabled': '#DDD3E8',
  '--kt-danger': '#e11d48',
} as const;

/** The soft brand wash behind every takeover screen. */
export const TAKEOVER_WASH =
  'radial-gradient(70% 40% at 15% 0%, rgba(255,200,238,0.5) 0%, transparent 60%), radial-gradient(60% 35% at 90% 8%, rgba(210,194,255,0.45) 0%, transparent 60%), radial-gradient(70% 40% at 50% 100%, rgba(255,216,203,0.4) 0%, transparent 60%)';

/**
 * Guest-record rates, in shekels, used by the estimate screen.
 *
 * Parameters rather than literals in the layout: WhatsApp is what we advertise
 * publicly today and SMS is a starting figure, and both are expected to move.
 * Nothing here is charged or saved - the estimate screen is not a checkout, and
 * the channel is re-chosen at payment time.
 */
export const CHANNEL_RATES = {
  whatsapp: 1.5,
  sms: 1.2,
} as const;

export type MessageChannel = keyof typeof CHANNEL_RATES;

/** The four event types, in the order the type screen lays them out. */
export const ONBOARDING_EVENT_TYPES = [
  'wedding',
  'henna',
  'bar_mitzva',
  'bat_mitzva',
] as const;
