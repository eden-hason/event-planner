import { setRequestLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { getUserProfile } from '@/features/auth/queries';
import { getDraftEvent, getLastUserEvent } from '@/features/events/queries';
import { OnboardingTakeover } from '@/features/events/components/onboarding/onboarding-takeover';

export const dynamic = 'force-dynamic';

export default async function StartPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // `?new` is that deliberate act: it comes from the app's own "new event"
  // control, and says the takeover was asked for rather than fallen into.
  const { new: requestedNew } = await searchParams;

  const [draft, profile] = await Promise.all([
    getDraftEvent(),
    getUserProfile(),
  ]);

  // Someone who already has a workspace and no draft has nothing to onboard.
  // Sending them to the takeover would ask them to create a second event they
  // never asked for; creating one is a deliberate act from the app itself.
  const existing = draft ? null : await getLastUserEvent();

  if (existing?.id && requestedNew === undefined) {
    redirect({ href: `/app/${existing.id}/dashboard`, locale });
  }

  return (
    <OnboardingTakeover
      draft={draft}
      // Someone who arrived from the app has a workspace to return to, so the
      // takeover's first screen gets a way out instead of a dead end.
      exitHref={existing?.id ? `/app/${existing.id}/dashboard` : undefined}
      profile={{
        fullName: profile?.fullName ?? '',
        phoneNumber: profile?.phoneNumber ?? '',
        email: profile?.email ?? '',
      }}
      needsProfile={!profile?.initialSetupComplete}
    />
  );
}
