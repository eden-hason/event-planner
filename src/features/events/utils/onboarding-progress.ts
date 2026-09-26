import type { OnboardingStep } from '../types';

/** The onboarding questions, in the order the takeover asks them. */
export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  'type',
  'names',
  'date',
  'venue',
] as const;

/**
 * The step stored by drafts that reached the retired estimate screen, which
 * used to be the last question. The database still allows it, and it means
 * every question that remains has been answered.
 */
const RETIRED_FINAL_STEP = 'estimate';

/**
 * Index of the furthest answered question in `ONBOARDING_STEPS`, or -1 when
 * nothing has been answered.
 */
export function answeredIndex(onboardingStep: string | null | undefined): number {
  if (onboardingStep === RETIRED_FINAL_STEP) return ONBOARDING_STEPS.length - 1;
  return ONBOARDING_STEPS.indexOf(onboardingStep as OnboardingStep);
}

/**
 * The question a Draft Event resumes at: the first one not yet answered.
 *
 * Driven by the stored `onboarding_step` rather than by which columns are
 * filled, because skipping is an answer - "we don't have a date yet" leaves
 * `event_date` null exactly as never reaching the screen does, and the couple
 * should not be asked twice.
 *
 * A draft that answered the last question but never published resumes there, so
 * the flow always has a screen to land on.
 */
export function resolveResumeStep(
  onboardingStep: string | null | undefined,
): OnboardingStep {
  const answeredIdx = answeredIndex(onboardingStep);
  if (answeredIdx < 0) return 'type';
  const next = ONBOARDING_STEPS[answeredIdx + 1];
  return next ?? ONBOARDING_STEPS[ONBOARDING_STEPS.length - 1];
}

/** Whether a step's question has already been answered on this draft. */
export function hasAnswered(
  onboardingStep: string | null | undefined,
  step: OnboardingStep,
): boolean {
  const answeredIdx = answeredIndex(onboardingStep);
  const stepIdx = ONBOARDING_STEPS.indexOf(step);
  return answeredIdx >= 0 && stepIdx >= 0 && answeredIdx >= stepIdx;
}
