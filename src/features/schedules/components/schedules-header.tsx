'use client';

import { useTranslations } from 'next-intl';
import { useFeatureHeader } from '@/components/feature-layout';

interface SchedulesHeaderProps {
  onAddSchedule?: () => void;
}

export function SchedulesHeader({ onAddSchedule }: SchedulesHeaderProps) {
  const t = useTranslations('schedules.header');

  useFeatureHeader({
    title: t('title'),
    description: t('description'),
  });

  return null;
}
