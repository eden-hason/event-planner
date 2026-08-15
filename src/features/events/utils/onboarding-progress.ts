import type { OnboardingStep } from '../types';

/** The onboarding questions, in the order the takeover asks them. */
export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  'type',
  'names',
  'date',
  'venue',
  'estimate',
] as const;

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
  const answeredIdx = ONBOARDING_STEPS.indexOf(onboardingStep as OnboardingStep);
  if (answeredIdx < 0) return 'type';
  const next = ONBOARDING_STEPS[answeredIdx + 1];
  return next ?? ONBOARDING_STEPS[ONBOARDING_STEPS.length - 1];
}

/** Whether a step's question has already been answered on this draft. */
export function hasAnswered(
  onboardingStep: string | null | undefined,
  step: OnboardingStep,
): boolean {
  const answeredIdx = ONBOARDING_STEPS.indexOf(onboardingStep as OnboardingStep);
  const stepIdx = ONBOARDING_STEPS.indexOf(step);
  return answeredIdx >= 0 && stepIdx >= 0 && answeredIdx >= stepIdx;
}
