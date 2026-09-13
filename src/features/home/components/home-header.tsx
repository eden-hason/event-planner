'use client';

import { useTranslations } from 'next-intl';
import { useFeatureHeader } from '@/components/feature-layout';

export function HomeHeader() {
  const t = useTranslations('home.header');

  useFeatureHeader({
    title: t('title'),
  });

  return null;
}
