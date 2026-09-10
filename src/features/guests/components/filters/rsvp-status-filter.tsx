'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { IconCheck, IconChevronDown } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { rsvpPresentation, RSVP_STATUSES } from '@/features/guests/utils';

interface RsvpStatusFilterProps {
  selectedStatuses: string[];
  onStatusToggle: (status: string) => void;
}

export function RsvpStatusFilter({
  selectedStatuses,
  onStatusToggle,
}: RsvpStatusFilterProps) {
  const t = useTranslations('guests');

  const statuses = RSVP_STATUSES.map((value) => ({
    value,
    className: rsvpPresentation(value).text,
    label: t(`rsvp.${value}` as 'rsvp.confirmed' | 'rsvp.pending' | 'rsvp.declined'),
  }));

  const isActive = selectedStatuses.length > 0;

  const label =
    !isActive
      ? t('filters.filterByStatus')
      : selectedStatuses.length === 1
        ? statuses.find((s) => s.value === selectedStatuses[0])?.label ??
          selectedStatuses[0]
        : `${selectedStatuses.length} ${t('filters.filterByStatus').toLowerCase()}`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'justify-between',
            isActive && 'border-primary/50 bg-primary/8 text-primary font-medium hover:bg-primary/15 hover:text-primary',
          )}
        >
          {label}
          <IconChevronDown
            size={16}
            className={cn('ml-2 shrink-0', isActive ? 'opacity-70' : 'opacity-50')}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[180px] p-0" align="start">
        <div className="p-2">
          {statuses.map((status) => {
            const isSelected = selectedStatuses.includes(status.value);
            return (
              <div
                key={status.value}
                onClick={() => onStatusToggle(status.value)}
                className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-sm p-2 text-sm transition-colors"
              >
                {isSelected ? (
                  <IconCheck size={16} className="shrink-0" />
                ) : (
                  <div className="h-4 w-4 shrink-0" />
                )}
                <span className={status.className}>{status.label}</span>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
