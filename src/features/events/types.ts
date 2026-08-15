/**
 * TypeScript-only types for the events feature. Zod lives in `schemas/`.
 */

/**
 * A question in the onboarding takeover, in the order it is asked.
 *
 * Stored on the event as the furthest step answered, where skipping a question
 * ("we don't have a date yet") counts as answering it.
 */
export type OnboardingStep = 'type' | 'names' | 'date' | 'venue' | 'estimate';

/**
 * What the takeover needs to resume a Draft Event: the answers already given,
 * and the question to open on.
 */
export type DraftEventResume = {
  eventId: string;
  eventType: string;
  /** Empty while the names screen is unanswered. */
  title: string;
  brideName?: string;
  groomName?: string;
  childName?: string;
  /** Null both before the date screen and after "no date yet" - `answeredDate` tells them apart. */
  eventDate: string | null;
  answeredDate: boolean;
  locationName?: string;
  answeredVenue: boolean;
  guestsEstimate?: number;
  /** The question to open on: the first one not yet answered. */
  resumeAt: OnboardingStep;
};
