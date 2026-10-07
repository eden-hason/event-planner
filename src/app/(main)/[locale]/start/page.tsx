import { setRequestLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { getUserProfile, getVisitorId } from '@/features/auth/queries';
import { getDraftEvent, getLastUserEvent } from '@/features/events/queries';
import { VisitorDroppedDialog } from '@/features/auth';
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

  const [draft, profile, visitorId] = await Promise.all([
    getDraftEvent(),
    getUserProfile(),
    getVisitorId(),
  ]);

  // No account: someone new, with no session until their first answer makes
  // them a Visitor, or a Visitor back for their draft. Either way the questions
  // come first, and who they are is asked when they save (ADR 0028).
  const hasAccount = !!profile && !visitorId;

  // Someone who already has a workspace and no draft has nothing to onboard.
  // Sending them to the takeover would ask them to create a second event they
  // never asked for; creating one is a deliberate act from the app itself.
  const existing = draft ? null : await getLastUserEvent();

  // A Visitor has one Event (ADR 0028): a second one waits until they save.
  if (existing?.id && (requestedNew === undefined || visitorId)) {
    redirect({ href: `/app/${existing.id}/home`, locale });
  }

  return (
    <>
    <OnboardingTakeover
      draft={draft}
      // Someone who arrived from the app has a workspace to return to, so the
      // takeover's first screen gets a way out instead of a dead end.
      exitHref={existing?.id ? `/app/${existing.id}/home` : undefined}
      profile={{
        fullName: profile?.fullName ?? '',
        phoneNumber: profile?.phoneNumber ?? '',
        email: profile?.email ?? '',
      }}
      needsProfile={hasAccount && !profile?.initialSetupComplete}
      hasAccount={hasAccount}
    />
    {/* An account with no event to land on lands here after a sign-in that
        dropped a Visitor's draft; it is told so once (ADR 0028). */}
    <VisitorDroppedDialog place="start" />
    </>
  );
}
