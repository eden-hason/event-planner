import { setRequestLocale, getTranslations } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { getCurrentUser } from '@/features/auth/queries';
import { AUTO_JOIN_PARAM, JoinCoPlannerPage } from '@/features/collaborate';
import {
  getCollaboratorAccess,
  getCoPlannerLinkPreview,
} from '@/features/collaborate/queries';

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

  if (!preview) {
    const t = await getTranslations('collaborate.joinPage');
    return (
      // theme-locked-light: reached from a shared link - see the comment
      // above `.theme-locked-light` in globals.css.
      <div className="theme-locked-light flex min-h-dvh items-center justify-center p-4">
        <div className="max-w-md text-center">
          <h1 className="mb-2 text-2xl font-bold">{t('invalidTitle')}</h1>
          <p className="text-muted-foreground">{t('invalidDescription')}</p>
        </div>
      </div>
    );
  }

  // A Visitor has a session but no account to plan with (ADR 0028).
  const signedIn = Boolean(user && !user.isVisitor);

  // Already planning this Event - the creator, or a co-planner opening the
  // link again: nothing to join, so straight to it (ADR 0041).
  if (signedIn && (await getCollaboratorAccess(preview.eventId))) {
    return redirect({ href: `/app/${preview.eventId}/home`, locale });
  }

  return (
    <JoinCoPlannerPage
      token={token}
      preview={preview}
      signedIn={signedIn}
      autoJoin={signedIn && query[AUTO_JOIN_PARAM] === '1'}
    />
  );
}
