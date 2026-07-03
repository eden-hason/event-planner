import { getUserProfile } from '@/features/auth/queries';
import { OnboardingFlow } from '@/features/events/components/onboarding/onboarding-flow';

export default async function NewEventPage() {
  const profile = await getUserProfile();
  const showPricingStep = process.env.ENABLE_PRICING_STEP === 'true';

  return (
    <OnboardingFlow
      initialSetupComplete={profile?.initialSetupComplete ?? false}
      profile={profile ?? {
        fullName: '',
        email: '',
        phoneNumber: '',
        avatarUrl: '',
        initialSetupComplete: false,
      }}
      showPricingStep={showPricingStep}
    />
  );
}
