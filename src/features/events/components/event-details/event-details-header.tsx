'use client';

import { useTranslations } from 'next-intl';
import { useFeatureHeader } from '@/components/feature-layout';

export function EventDetailsHeader() {
  const t = useTranslations('eventDetails.header');

  useFeatureHeader({
    title: t('title'),
    description: t('description'),
    containerClass: 'mx-auto w-full max-w-3xl',
  });

  return null;
}
