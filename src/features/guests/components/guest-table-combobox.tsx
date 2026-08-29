'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { IconChevronDown } from '@tabler/icons-react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { TableOption } from '@/features/seating';

interface GuestTableComboboxProps {
  tables: TableOption[];
  /** Selected table id, or null when the guest has no table */
  value: string | null;
  onChange: (tableId: string | null) => void;
  /** Heads this record brings *as currently edited*, so ineligible tables can be disabled. */
  partyHeads: number;
  /**
   * The Table this record is already seated at (persisted), and the head count
   * it currently reserves there. Those seats belong to this record, so at its
   * current Table the available capacity is the reported free seats plus this
   * many - and an edited party that now exceeds that total makes even the
   * current Table ineligible (ADR-0008).
   */
  originalTableId?: string | null;
  originalPartyHeads?: number;
  guestName?: string;
  disabled?: boolean;
}

/**
 * Table picker for the guest form.
 *
 * Writes guests.table_id - the same assignment the Seating Plan makes - so a
 * host can seat a guest without leaving the directory. It cannot create a
 * table: all table creation belongs to the Seating Plan's single and batch
 * flows, so the directory has one job and does it in one place.
 *
 * Every option carries the destination's real occupancy, and one that cannot
 * take this record is disabled with the shortfall rather than offered and then
 * refused (ADR-0008).
 */
export function GuestTableCombobox({
  tables,
  value,
  onChange,
  partyHeads,
  originalTableId = null,
  originalPartyHeads = 0,
  guestName,
  disabled = false,
}: GuestTableComboboxProps) {
  const t = useTranslations('guests.form.table');
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const displayName = React.useCallback(
    (table: Pick<TableOption, 'tableNumber' | 'label'>) =>
      table.label
        ? t('tableTitle', { number: table.tableNumber, label: table.label })
        : t('tableNumber', { number: table.tableNumber }),
    [t],
  );

  const sorted = React.useMemo(
    () => [...tables].sort((a, b) => a.tableNumber - b.tableNumber),
    [tables],
  );

  const selected = sorted.find((table) => table.id === value) ?? null;

  const describe = (table: TableOption) => {
    const seated = table.confirmedHeads + table.pendingHeads;
    if (seated === 0) return t('emptyWithPlaces', { capacity: table.capacity });
    return table.pendingHeads > 0
      ? t('occupancyWithPending', {
          confirmed: table.confirmedHeads,
          pending: table.pendingHeads,
          capacity: table.capacity,
        })
      : t('occupancy', { confirmed: table.confirmedHeads, capacity: table.capacity });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className={cn(!selected && 'text-muted-foreground')}>
            {selected ? displayName(selected) : t('placeholder')}
          </span>
          <IconChevronDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          {guestName && (
            <p className="text-muted-foreground border-b px-3 py-2 text-xs">
              {t('assigning', { name: guestName, heads: partyHeads })}
            </p>
          )}
          <CommandInput
            placeholder={t('searchPlaceholder')}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>{t('empty')}</CommandEmpty>
            <CommandGroup>
              {value !== null && (
                <CommandItem
                  value="clear"
                  onSelect={() => {
                    onChange(null);
                    setSearch('');
                    setOpen(false);
                  }}
                >
                  <span className="text-muted-foreground">{t('none')}</span>
                </CommandItem>
              )}
              {sorted
                .filter((table) => {
                  const term = search.trim().toLowerCase();
                  if (!term) return true;
                  return (
                    String(table.tableNumber).includes(term) ||
                    (table.label ?? '').toLowerCase().includes(term)
                  );
                })
                .map((table) => {
                  // Total occupancy from the database already counts this
                  // record's current seats, so at its own Table those seats are
                  // available to it again - but nothing more. Everywhere else,
                  // free capacity is measured against the full occupancy,
                  // including assignments made outside this collaborator's scope.
                  const reservedHere =
                    originalTableId === table.id ? originalPartyHeads : 0;
                  const free =
                    table.capacity -
                    table.confirmedHeads -
                    table.pendingHeads +
                    reservedHere;
                  const isCurrent = value === table.id;
                  const fits = partyHeads <= free;

                  return (
                    <CommandItem
                      key={table.id}
                      value={table.id}
                      disabled={!fits}
                      onSelect={() => {
                        if (!fits) return;
                        onChange(table.id);
                        setSearch('');
                        setOpen(false);
                      }}
                      className={cn(!fits && 'opacity-55')}
                    >
                      <Check
                        className={cn('size-4', isCurrent ? 'opacity-100' : 'opacity-0')}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{displayName(table)}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          {describe(table)}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2 py-0.5 text-xs',
                          fits
                            ? 'bg-rsvp-confirmed/16 text-rsvp-confirmed'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {fits ? t('fits') : t('short', { count: partyHeads - free })}
                      </span>
                    </CommandItem>
                  );
                })}
            </CommandGroup>
          </CommandList>
          <p className="text-muted-foreground border-t px-3 py-2 text-xs">
            {t('footer')}
          </p>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
