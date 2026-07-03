'use client';

import { useTranslations } from 'next-intl';
import { Monitor } from 'lucide-react';

export function SeatingMobilePlaceholder() {
  const t = useTranslations('seating');
  return (
    <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <Monitor className="h-12 w-12 text-muted-foreground" />
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{t('mobile.title')}</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          {t('mobile.description')}
        </p>
      </div>
    </div>
  );
}
