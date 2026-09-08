'use client';

import { useTranslations } from 'next-intl';
import { Lock } from 'lucide-react';

export function PrivacyNote() {
  const t = useTranslations('gifting.privacy');
  return (
    <aside className="flex items-start gap-3 rounded-xl border bg-card p-4">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Lock className="size-4" />
      </span>
      <p className="text-sm text-muted-foreground text-pretty">
        <strong className="font-semibold text-foreground">{t('title')}</strong>{' '}
        {t('body')}
      </p>
    </aside>
  );
}
