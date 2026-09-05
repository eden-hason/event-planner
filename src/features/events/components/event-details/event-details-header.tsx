'use client';

import { useTranslations } from 'next-intl';
import { useFeatureHeader } from '@/components/feature-layout';

export function EventDetailsHeader() {
  const t = useTranslations('eventDetails.header');

  useFeatureHeader({
    title: t('title'),
  });

  return null;
}
