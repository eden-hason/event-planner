'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react';
import { useFeatureHeader } from '@/components/feature-layout';

interface SchedulesHeaderProps {
  onAddSchedule?: () => void;
}

export function SchedulesHeader({ onAddSchedule }: SchedulesHeaderProps) {
  const headerAction = useMemo(
    () => (
      <Button onClick={onAddSchedule}>
        <PlusIcon className="size-4" />
        Add Schedule
      </Button>
    ),
    [onAddSchedule]
  );

  useFeatureHeader({
    title: 'Schedules',
    description: 'Manage your event schedule and timeline',
    action: headerAction,
  });

  return null;
}

