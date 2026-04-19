'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { IconCheck, IconChevronDown } from '@tabler/icons-react';

const RSVP_STATUS_VALUES = [
  { value: 'confirmed', className: 'text-green-700' },
  { value: 'pending', className: 'text-yellow-700' },
  { value: 'declined', className: 'text-red-700' },
] as const;

interface RsvpStatusFilterProps {
  selectedStatuses: string[];
  onStatusToggle: (status: string) => void;
}

export function RsvpStatusFilter({
  selectedStatuses,
  onStatusToggle,
}: RsvpStatusFilterProps) {
  const t = useTranslations('guests');

  const statuses = RSVP_STATUS_VALUES.map((s) => ({
    ...s,
    label: t(`rsvp.${s.value}` as 'rsvp.confirmed' | 'rsvp.pending' | 'rsvp.declined'),
  }));

  const label =
    selectedStatuses.length === 0
      ? t('filters.filterByStatus')
      : selectedStatuses.length === 1
        ? statuses.find((s) => s.value === selectedStatuses[0])?.label ??
          selectedStatuses[0]
        : `${selectedStatuses.length} ${t('filters.filterByStatus').toLowerCase()}`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-[180px] justify-between">
          {label}
          <IconChevronDown size={16} className="ml-2 shrink-0 opacity-50" />
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
