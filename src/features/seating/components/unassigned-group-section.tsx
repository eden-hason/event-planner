'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { GuestGroupSection } from '../utils/grouping';
import { UnassignedGuestRow } from './unassigned-guest-row';
import { useSeatingCopy } from './use-seating-copy';

interface UnassignedGroupSectionProps {
  section: GuestGroupSection;
  selectedIds: string[];
  onToggleSelect: (guestId: string) => void;
  onSelectAll: (guestIds: string[]) => void;
  onAssignOne: (guestId: string) => void;
  draggable?: boolean;
}

/**
 * One group of unassigned records.
 *
 * Guests are grouped for one reason: a group is usually seated together, so
 * "Select all" plus a single Assign is the whole workflow this view exists for.
 * The heading carries the group's own record and head count, because those
 * decide which Table the group can fit at before anyone opens a picker.
 */
export function UnassignedGroupSection({
  section,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onAssignOne,
  draggable = false,
}: UnassignedGroupSectionProps) {
  const { t } = useSeatingCopy();
  const [open, setOpen] = React.useState(true);

  const meta = t('unassigned.countLine', {
    records: section.guests.length,
    heads: section.heads,
  });

  return (
    <div>
      <div className="bg-muted flex items-center gap-2 rounded-lg py-2 ps-1 pe-2">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-label={t('unassigned.toggleGroup')}
          className="text-muted-foreground hover:text-foreground flex size-7 shrink-0 items-center justify-center rounded-md transition-colors"
        >
          {/* One icon, turned. The RTL twin keeps a collapsed group pointing
              into the list rather than away from it. */}
          <ChevronDown
            className={cn(
              'size-4 transition-transform',
              !open && '-rotate-90 rtl:rotate-90',
            )}
          />
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {section.name ?? t('unassigned.noGroup')}
          </p>
          <p className="text-muted-foreground truncate text-xs tabular-nums">
            {meta}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="bg-card shrink-0"
          onClick={() => onSelectAll(section.guests.map((guest) => guest.id))}
        >
          {t('unassigned.selectAll')}
        </Button>
      </div>

      {open && (
        <div className="border-border ms-4 mt-2 space-y-2 border-s ps-3">
          {section.guests.map((guest) => (
            <UnassignedGuestRow
              key={guest.id}
              guest={guest}
              selected={selectedIds.includes(guest.id)}
              onToggle={() => onToggleSelect(guest.id)}
              onAssign={() => onAssignOne(guest.id)}
              draggable={draggable}
              showGroup={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
