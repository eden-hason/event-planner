import { getTranslations, setRequestLocale } from 'next-intl/server';

/**
 * Email invitations were replaced by the Co-planner Link (ADR 0041). An old
 * invitation link still opens, and says so, rather than a 404.
 */
export default async function RetiredInvitationPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('collaborate.joinPage');

  return (
    // theme-locked-light: reached from an invite link - see the comment
    // above `.theme-locked-light` in globals.css.
    <div className="theme-locked-light flex min-h-dvh items-center justify-center p-4">
      <div className="max-w-md text-center">
        <h1 className="mb-2 text-2xl font-bold">{t('invalidTitle')}</h1>
        <p className="text-muted-foreground">{t('invalidDescription')}</p>
      </div>
    </div>
  );
}
