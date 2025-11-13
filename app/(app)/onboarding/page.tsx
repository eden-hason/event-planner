import { OnboardingForm } from '@/components/onboarding/onboarding-form';
import { getOnboardingProfileData } from '@/app/actions/onboarding';

export default async function OnboardingPage() {
  // Fetch profile data for the authenticated user
  const profileData = await getOnboardingProfileData();

  return (
    <div className="">
      <div className="">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome to Kululu Events
          </h1>
          <p className="text-muted-foreground mt-2">
            Let&apos;s get your account set up so you can start planning amazing
            events
          </p>
        </div>

        {/* Main Content */}
        <OnboardingForm initialData={profileData || undefined} />
      </div>
    </div>
  );
}
