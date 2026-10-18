import { useTranslations } from 'next-intl';

/**
 * A Co-planner Link with an unknown token, or a retired email invitation link
 * (ADR 0041): say so, rather than a 404.
 */
export function InvalidCoPlannerLink() {
  const t = useTranslations('collaborate.joinPage');

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
