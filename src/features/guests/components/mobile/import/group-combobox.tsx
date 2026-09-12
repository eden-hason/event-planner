'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { IconChevronDown } from '@tabler/icons-react';
import { Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { GroupApp } from '@/features/guests/schemas';

interface GroupComboboxProps {
  groups: GroupApp[];
  /** The row's current side, so groups on that side surface first. */
  side: 'bride' | 'groom' | null;
  value: string | null;
  onChange: (name: string | null) => void;
}

/**
 * Free-text group picker for the row-edit sheet: existing groups are offered
 * first, and typing anything else offers to create it. Reachable groups
 * import auto-creates whatever name it's handed, so a plain text field here
 * would let a typo like "Familly" silently become a second, permanent group
 * next to "Family" - this steers toward the one that already exists instead.
 */
export function GroupCombobox({ groups, side, value, onChange }: GroupComboboxProps) {
  const t = useTranslations('guests.import.mobile.edit');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const uniqueNames = Array.from(new Set(groups.map((g) => g.name))).sort((a, b) => {
    const aSide = groups.find((g) => g.name === a)?.side === side;
    const bSide = groups.find((g) => g.name === b)?.side === side;
    if (aSide === bSide) return a.localeCompare(b);
    return aSide ? -1 : 1;
  });

  const term = search.trim();
  const exactMatch = uniqueNames.some(
    (name) => name.toLowerCase() === term.toLowerCase(),
  );
  const filtered = uniqueNames.filter((name) =>
    term ? name.toLowerCase().includes(term.toLowerCase()) : true,
  );

  const select = (name: string | null) => {
    onChange(name);
    setSearch('');
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={cn(!value && 'text-muted-foreground')}>
            {value ?? t('groupNone')}
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
            placeholder={t('groupSearchPlaceholder')}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {term ? (
                <button
                  type="button"
                  onClick={() => select(term)}
                  className="text-primary flex w-full items-center gap-2 px-2 py-1.5 text-sm"
                >
                  <Plus className="size-4" />
                  {t('groupCreateOption', { name: term })}
                </button>
              ) : null}
            </CommandEmpty>
            <CommandGroup>
              <CommandItem value="__none__" onSelect={() => select(null)}>
                <Check className={cn('size-4', !value ? 'opacity-100' : 'opacity-0')} />
                <span className="text-muted-foreground">{t('groupNone')}</span>
              </CommandItem>
              {filtered.map((name) => (
                <CommandItem key={name} value={name} onSelect={() => select(name)}>
                  <Check
                    className={cn('size-4', value === name ? 'opacity-100' : 'opacity-0')}
                  />
                  {name}
                </CommandItem>
              ))}
              {term && !exactMatch && (
                <CommandItem value={`create:${term}`} onSelect={() => select(term)}>
                  <Plus className="text-primary size-4" />
                  <span className="text-primary">
                    {t('groupCreateOption', { name: term })}
                  </span>
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
