'use client';

import { useEffect, useMemo } from 'react';
import { IconDeviceFloppy, IconX } from '@tabler/icons-react';
import { useFeatureHeader } from '@/components/feature-layout';
import { Button } from '@/components/ui/button';

interface SchedulesHeaderProps {
  formId: string;
  isDirty: boolean;
  isPending?: boolean;
  onDiscard?: () => void;
}

export function SchedulesHeader({
  formId,
  isDirty,
  isPending = false,
  onDiscard,
}: SchedulesHeaderProps) {
  const headerAction = useMemo(
    () => (
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={!isDirty || isPending}
          onClick={onDiscard}
        >
          <IconX className="size-4" />
          Discard
        </Button>
        <Button type="submit" form={formId} disabled={!isDirty || isPending}>
          <IconDeviceFloppy className="size-4" />
          {isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>
    ),
    [formId, isDirty, isPending, onDiscard],
  );

  const { setHeader } = useFeatureHeader({
    title: 'Schedules',
    description: 'Manage your event schedule and timeline',
    action: headerAction,
  });

  // Update header action when isDirty or isPending changes
  useEffect(() => {
    setHeader({
      title: 'Schedules',
      description: 'Manage your event schedule and timeline',
      action: headerAction,
    });
  }, [headerAction, setHeader]);

  return null;
}
