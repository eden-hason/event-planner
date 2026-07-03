'use client';

import { useTranslations } from 'next-intl';
import { useFeatureHeader } from '@/components/feature-layout';

export function DashboardHeader() {
  const t = useTranslations('dashboard.header');

  useFeatureHeader({
    title: t('title'),
    description: t('description'),
  });

  return null;
}
