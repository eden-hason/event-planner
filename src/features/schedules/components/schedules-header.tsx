'use client';

import { useTranslations } from 'next-intl';
import { useFeatureHeader } from '@/components/feature-layout';

export function SchedulesHeader() {
  const t = useTranslations('schedules.header');

  useFeatureHeader({
    title: t('title'),
  });

  return null;
}
