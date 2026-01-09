'use client';

import { useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { IconDeviceFloppy, IconX } from '@tabler/icons-react';
import { useFeatureHeader } from '@/components/feature-layout';

interface EventDetailsHeaderProps {
  formId: string;
  isDirty: boolean;
  isPending?: boolean;
  onDiscard?: () => void;
}

export function EventDetailsHeader({
  formId,
  isDirty,
  isPending = false,
  onDiscard,
}: EventDetailsHeaderProps) {
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
    title: 'Event Details',
    description: 'View and manage your event information',
    action: headerAction,
  });

  // Update header action when isDirty or isPending changes
  useEffect(() => {
    setHeader({
      title: 'Event Details',
      description: 'View and manage your event information',
      action: headerAction,
    });
  }, [headerAction, setHeader]);

  return null;
}
