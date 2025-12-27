'use client';

import { useFeatureHeader } from '@/components/feature-layout';

export function DashboardHeader() {
  useFeatureHeader({
    title: 'Dashboard',
    description: 'Overview of your event',
  });

  return null;
}
