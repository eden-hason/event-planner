'use client';

import { useState } from 'react';
import { PersonalInfoStep } from '@/features/auth/components/personal-info-step';
import { OnboardingWizard } from './onboarding-wizard';
import type { ProfileData } from '@/features/auth/schemas';

interface OnboardingFlowProps {
  initialSetupComplete: boolean;
  profile: ProfileData;
}

export function OnboardingFlow({ initialSetupComplete, profile }: OnboardingFlowProps) {
  const [step, setStep] = useState<'profile' | 'event'>(
    initialSetupComplete ? 'event' : 'profile',
  );

  if (step === 'profile') {
    return <PersonalInfoStep profile={profile} onComplete={() => setStep('event')} />;
  }

  return <OnboardingWizard />;
}
