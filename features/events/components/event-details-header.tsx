'use client';

import { Button } from '@/components/ui/button';
import { IconPencil } from '@tabler/icons-react';
import { useFeatureHeader } from '@/components/feature-layout';
import { useMemo } from 'react';

interface EventDetailsHeaderProps {
  onEdit?: () => void;
}

export function EventDetailsHeader({ onEdit }: EventDetailsHeaderProps) {
  const headerAction = useMemo(
    () => (
      <Button onClick={onEdit}>
        <IconPencil className="size-4" />
        Edit Event
      </Button>
    ),
    [onEdit],
  );

  useFeatureHeader({
    title: 'Event Details',
    description: 'View and manage your event information',
    action: headerAction,
  });

  return null;
}
