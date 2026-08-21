'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { IconChevronDown, IconPlus } from '@tabler/icons-react';
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
import { createTable, type TableOption } from '@/features/seating';

interface GuestTableComboboxProps {
  eventId: string;
  tables: TableOption[];
  /** Selected table id, or null when the guest has no table */
  value: string | null;
  onChange: (tableId: string | null) => void;
  disabled?: boolean;
}

const tableDisplayName = (
  table: Pick<TableOption, 'tableNumber' | 'label'>,
  numberLabel: (n: number) => string,
) => (table.label ? `${numberLabel(table.tableNumber)} · ${table.label}` : numberLabel(table.tableNumber));

/**
 * Table picker for the guest form.
 *
 * Writes guests.table_id - the same assignment the seating canvas makes - so a
 * host can seat a guest without opening the floor plan. Typing a number that
 * has no table yet creates one on the spot (round, default capacity), which is
 * why the created table persists even if the guest form is then cancelled.
 */
export function GuestTableCombobox({
  eventId,
  tables,
  value,
  onChange,
  disabled = false,
}: GuestTableComboboxProps) {
  const t = useTranslations('guests.form.table');
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [isCreating, setIsCreating] = React.useState(false);
  // Tables created from this combobox, kept locally so the new one is
  // selectable immediately rather than after the page revalidates.
  const [createdTables, setCreatedTables] = React.useState<TableOption[]>([]);

  const numberLabel = React.useCallback(
    (n: number) => t('tableNumber', { number: n }),
    [t],
  );

  const allTables = React.useMemo(() => {
    const byId = new Map<string, TableOption>();
    for (const table of [...tables, ...createdTables]) byId.set(table.id, table);
    return [...byId.values()].sort((a, b) => a.tableNumber - b.tableNumber);
  }, [tables, createdTables]);

  const selected = allTables.find((table) => table.id === value) ?? null;

  // A bare number the host typed that no table claims yet
  const typedNumber = /^\d+$/.test(search.trim())
    ? Number(search.trim())
    : null;
  const canCreate =
    typedNumber !== null &&
    typedNumber >= 1 &&
    typedNumber <= 999 &&
    !allTables.some((table) => table.tableNumber === typedNumber);

  const handleCreate = async () => {
    if (typedNumber === null || isCreating) return;
    setIsCreating(true);
    try {
      const formData = new FormData();
      formData.append('tableNumber', String(typedNumber));
      formData.append('shape', 'round');
      formData.append('capacity', '8');

      const result = await createTable(eventId, formData);
      if (!result.success || !result.table) {
        toast.error(result.message || t('createError'));
        return;
      }

      const created: TableOption = {
        id: result.table.id,
        tableNumber: result.table.tableNumber,
        label: result.table.label,
        capacity: result.table.capacity,
        seatedHeadCount: 0,
      };
      setCreatedTables((prev) => [...prev, created]);
      onChange(created.id);
      setSearch('');
      setOpen(false);
    } finally {
      setIsCreating(false);
    }
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
            {selected ? tableDisplayName(selected, numberLabel) : t('placeholder')}
          </span>
          <IconChevronDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t('searchPlaceholder')}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {!canCreate && <CommandEmpty>{t('empty')}</CommandEmpty>}
            {canCreate && (
              <CommandGroup>
                <CommandItem
                  value={`create-${typedNumber}`}
                  disabled={isCreating}
                  onSelect={handleCreate}
                >
                  <IconPlus className="size-4" />
                  {t('create', { number: typedNumber })}
                </CommandItem>
              </CommandGroup>
            )}
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
              {allTables
                .filter((table) => {
                  const term = search.trim().toLowerCase();
                  if (!term) return true;
                  return (
                    String(table.tableNumber).includes(term) ||
                    (table.label ?? '').toLowerCase().includes(term)
                  );
                })
                .map((table) => {
                  const isFull = table.seatedHeadCount >= table.capacity;
                  return (
                    <CommandItem
                      key={table.id}
                      value={table.id}
                      onSelect={() => {
                        onChange(table.id);
                        setSearch('');
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          'size-4',
                          value === table.id ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      <span className="flex-1">
                        {tableDisplayName(table, numberLabel)}
                      </span>
                      <span
                        className={cn(
                          'text-xs tabular-nums',
                          isFull ? 'text-destructive' : 'text-muted-foreground',
                        )}
                      >
                        {table.seatedHeadCount}/{table.capacity}
                      </span>
                    </CommandItem>
                  );
                })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
