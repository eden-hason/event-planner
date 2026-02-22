'use client';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ChevronDown, Check } from 'lucide-react';

const RSVP_STATUSES = [
  { value: 'confirmed', label: 'Confirmed', className: 'text-green-700' },
  { value: 'pending', label: 'Pending', className: 'text-yellow-700' },
  { value: 'declined', label: 'Declined', className: 'text-red-700' },
] as const;

interface RsvpStatusFilterProps {
  selectedStatuses: string[];
  onStatusToggle: (status: string) => void;
}

export function RsvpStatusFilter({
  selectedStatuses,
  onStatusToggle,
}: RsvpStatusFilterProps) {
  const label =
    selectedStatuses.length === 0
      ? 'Filter by status'
      : selectedStatuses.length === 1
        ? RSVP_STATUSES.find((s) => s.value === selectedStatuses[0])?.label ??
          selectedStatuses[0]
        : `${selectedStatuses.length} statuses`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-[180px] justify-between">
          {label}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[180px] p-0" align="start">
        <div className="p-2">
          {RSVP_STATUSES.map((status) => {
            const isSelected = selectedStatuses.includes(status.value);
            return (
              <div
                key={status.value}
                onClick={() => onStatusToggle(status.value)}
                className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-sm p-2 text-sm transition-colors"
              >
                {isSelected ? (
                  <Check className="h-4 w-4 shrink-0" />
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
