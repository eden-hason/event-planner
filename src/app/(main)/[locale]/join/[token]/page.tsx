import { setRequestLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { getCurrentUser } from '@/features/auth/queries';
import { InvalidCoPlannerLink, JoinCoPlannerPage } from '@/features/collaborate';
import { getCoPlannerLinkPreview } from '@/features/collaborate/queries';

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; token: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  const [preview, user, query] = await Promise.all([
    getCoPlannerLinkPreview(token),
    getCurrentUser(),
    searchParams,
  ]);

  if (!preview) return <InvalidCoPlannerLink />;

  // Already planning this Event - the creator, or a co-planner opening the
  // link again: nothing to join, so straight to it (ADR 0041).
  if (preview.alreadyMember) {
    return redirect({ href: `/app/${preview.eventId}/home`, locale });
  }

  return (
    <JoinCoPlannerPage
      token={token}
      preview={preview}
      // A Visitor has a session but no account to plan with (ADR 0028).
      signedIn={Boolean(user && !user.isVisitor)}
      failed={query.failed === '1'}
    />
  );
}
