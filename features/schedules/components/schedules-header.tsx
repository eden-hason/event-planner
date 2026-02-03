'use client';

import { useFeatureHeader } from '@/components/feature-layout';

interface SchedulesHeaderProps {
  onAddSchedule?: () => void;
}

export function SchedulesHeader({ onAddSchedule }: SchedulesHeaderProps) {

  useFeatureHeader({
    title: 'Schedules',
    description: 'Manage your event schedule and timeline',
  });

  return null;
}
