'use client';

import { useTranslations } from 'next-intl';

import { RefreshButton } from '@/components/refresh-button';

export function InteractionsRefreshButton() {
  const t = useTranslations('schedules.interactions');

  return <RefreshButton label={t('refresh')} />;
}
