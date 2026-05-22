'use client';

import { useTranslations } from 'next-intl';
import { useFeatureHeader } from '@/components/feature-layout/feature-layout-context';

export function TemplatesHeader() {
  const t = useTranslations('templates.header');
  useFeatureHeader({
    title: t('title'),
    description: t('description'),
  });
  return null;
}
