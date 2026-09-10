import { rsvpPresentation } from '@/features/guests';
import type { CallOutcome } from '../types';

/**
 * How a Call Outcome looks. The module owns *which hue means which outcome*;
 * each surface still chooses its own affordance - the Owner's results table
 * renders chips, the Back Office renders an idle/recorded button pair.
 *
 * Confirmed and declined deliberately borrow the RSVP vocabulary, because that
 * is what they become: a Call Outcome of confirmed or declined carries straight
 * through to the Guest's RSVP.
 */

export interface CallOutcomePresentation {
  /** Tint plus text that clears 4.5:1 on it. */
  chip: string;
  /** Solid fill plus its own foreground, for the recorded outcome. */
  filled: string;
  /** 500-level, for icons and dots. Graphics only, not words. */
  accent: string;
  /** Strong text on the page background. Safe for words. */
  text: string;
}

const NEUTRAL: CallOutcomePresentation = {
  chip: 'bg-muted text-muted-foreground',
  filled: 'bg-muted-foreground text-background',
  accent: 'text-muted-foreground',
  text: 'text-muted-foreground',
};

const PRESENTATION: Record<CallOutcome, CallOutcomePresentation> = {
  confirmed: {
    chip: rsvpPresentation('confirmed').chip,
    filled: 'bg-rsvp-confirmed-strong text-background',
    accent: rsvpPresentation('confirmed').accent,
    text: rsvpPresentation('confirmed').text,
  },
  declined: {
    chip: rsvpPresentation('declined').chip,
    filled: 'bg-rsvp-declined-strong text-background',
    accent: rsvpPresentation('declined').accent,
    text: rsvpPresentation('declined').text,
  },
  /*
   * No answer takes the pending hue because on the Owner's results table it is
   * one outcome among several. The Back Office deliberately overrides it to
   * neutral - there it is the absence of a result, not one of them.
   */
  no_answer: {
    chip: rsvpPresentation('pending').chip,
    filled: 'bg-rsvp-pending-strong text-background',
    accent: rsvpPresentation('pending').accent,
    text: rsvpPresentation('pending').text,
  },
  guest_will_update: {
    chip: 'bg-outcome-will-update-tint text-outcome-will-update-strong',
    filled: 'bg-outcome-will-update-strong text-background',
    accent: 'text-outcome-will-update',
    text: 'text-outcome-will-update-strong',
  },
};

export function callOutcomePresentation(
  outcome: CallOutcome | null,
): CallOutcomePresentation {
  return outcome ? PRESENTATION[outcome] : NEUTRAL;
}
