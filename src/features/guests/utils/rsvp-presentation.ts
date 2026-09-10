import type { GuestApp } from '../schemas';

/**
 * How an RSVP looks. One table, so a Guest Record's answer reads the same in
 * the guest list, the Seating Plan, the dashboard and the Back Office.
 *
 * Before this existed the decision was made at 17 call sites in 6 mutually
 * incompatible palettes - `bg-green-100`, `bg-emerald-50`, `border-emerald-300`
 * and `bg-rsvp-confirmed` all meant "confirmed", and none of them adapted to
 * dark mode. Add a role here rather than a colour at the call site.
 */

/** Tied to the Zod enum so the two can never drift. */
export type RsvpStatus = GuestApp['rsvpStatus'];

/** Display order: the answer we want, the answer we are waiting for, the no. */
export const RSVP_STATUSES = [
  'confirmed',
  'pending',
  'declined',
] as const satisfies readonly RsvpStatus[];

export interface RsvpPresentation {
  /**
   * Tinted surface plus text that clears 4.5:1 on it. For pills and chips.
   * Never pair the 500-level token with a tint - that lands around 2.8:1.
   */
  chip: string;
  /** Tinted surface plus a matching border. For a selected/active card. */
  activeSurface: string;
  /** Solid 500-level. For dots, meter bars and progress fills. */
  solid: string;
  /** SVG `fill`, for the seat diagram. */
  fill: string;
  /**
   * 500-level text, for icons and other non-text graphics only - it clears
   * 3:1 as a graphic but not 4.5:1 as text. For words, use `text`.
   */
  accent: string;
  /** Strong text on the page background. Safe for words. */
  text: string;
  /** Hairline border plus text, for a chip that must not read as filled. */
  outline: string;
  /**
   * The raw custom-property reference, for chart libraries that take a colour
   * value rather than a class (Recharts `fill`, inline `style`).
   */
  cssVar: string;
}

const PRESENTATION: Record<RsvpStatus, RsvpPresentation> = {
  confirmed: {
    chip: 'bg-rsvp-confirmed-tint text-rsvp-confirmed-strong',
    activeSurface: 'bg-rsvp-confirmed-tint border-rsvp-confirmed/45',
    solid: 'bg-rsvp-confirmed',
    fill: 'fill-rsvp-confirmed',
    accent: 'text-rsvp-confirmed',
    text: 'text-rsvp-confirmed-strong',
    outline: 'border-rsvp-confirmed/45 text-rsvp-confirmed-strong',
    cssVar: 'var(--rsvp-confirmed)',
  },
  pending: {
    chip: 'bg-rsvp-pending-tint text-rsvp-pending-strong',
    activeSurface: 'bg-rsvp-pending-tint border-rsvp-pending/45',
    solid: 'bg-rsvp-pending',
    fill: 'fill-rsvp-pending',
    accent: 'text-rsvp-pending',
    text: 'text-rsvp-pending-strong',
    outline: 'border-rsvp-pending/45 text-rsvp-pending-strong',
    cssVar: 'var(--rsvp-pending)',
  },
  declined: {
    chip: 'bg-rsvp-declined-tint text-rsvp-declined-strong',
    activeSurface: 'bg-rsvp-declined-tint border-rsvp-declined/45',
    solid: 'bg-rsvp-declined',
    fill: 'fill-rsvp-declined',
    accent: 'text-rsvp-declined',
    text: 'text-rsvp-declined-strong',
    outline: 'border-rsvp-declined/45 text-rsvp-declined-strong',
    cssVar: 'var(--rsvp-declined)',
  },
};

export function rsvpPresentation(status: RsvpStatus): RsvpPresentation {
  return PRESENTATION[status];
}

/** The i18n namespace holding the three labels. */
export const RSVP_LABEL_NAMESPACE = 'guests.rsvp';
