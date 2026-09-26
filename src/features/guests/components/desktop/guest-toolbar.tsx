'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  IconArrowsSort,
  IconBrandGoogleDrive,
  IconCheck,
  IconChevronDown,
  IconDots,
  IconFileSpreadsheet,
  IconFilter2,
  IconPlus,
  IconSearch,
  IconUpload,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/toggle-switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { GroupWithGuestsApp, GroupSide } from '@/features/guests/schemas';
import type { RsvpStatus } from '@/features/guests/utils';
import type { IplanScope } from '@/features/guests/utils';
import {
  activeFilterCount,
  GUEST_SORT_KEYS,
  type GuestListParams,
} from '@/features/guests/utils/guest-list-params';
import { cn } from '@/lib/utils';
import { SelectBox } from './select-box';
import { sideDotClass } from './side-dot';

const STATUS_CHIPS: (RsvpStatus | null)[] = [
  null,
  'confirmed',
  'pending',
  'declined',
];

interface GuestToolbarProps {
  params: GuestListParams;
  onChange: (
    patch: Partial<GuestListParams>,
    mode?: 'push' | 'replace',
  ) => void;
  /** Guest Records per status, over the whole list - the chip counts. */
  statusCounts: Record<RsvpStatus | 'all', number>;
  groups: GroupWithGuestsApp[];
  /** The toolbar has scrolled into its sticky position - it grows a shadow. */
  stuck: boolean;
  onAddGuest: () => void;
  onImportFile: () => void;
  onImportDrive: () => void;
  onExport: (scope: IplanScope) => void;
}

export function GuestToolbar({
  params,
  onChange,
  statusCounts,
  groups,
  stuck,
  onAddGuest,
  onImportFile,
  onImportDrive,
  onExport,
}: GuestToolbarProps) {
  const t = useTranslations('guests');
  const dir = useLocale() === 'he' ? 'rtl' : 'ltr';
  const filterCount = activeFilterCount(params);

  // The input keeps its own value so typing never waits on the URL; the URL
  // follows with `replace`, so back does not replay every keystroke.
  const [query, setQuery] = useState(params.q);
  useEffect(() => setQuery(params.q), [params.q]);

  const toggleGroup = (id: string) =>
    onChange({
      groups: params.groups.includes(id)
        ? params.groups.filter((groupId) => groupId !== id)
        : [...params.groups, id],
    });

  return (
    <div
      className={cn(
        'bg-card sticky top-0 z-20 -mx-6 flex items-center gap-2.5 px-6 py-3 transition-shadow',
        stuck &&
          'shadow-[0_1px_0_var(--border),0_8px_18px_-12px_rgba(26,11,46,0.35)]',
      )}
    >
      <label className="border-input bg-card focus-within:border-ring focus-within:ring-ring/50 flex h-9 w-[290px] shrink-0 items-center gap-2 rounded-[10px] border px-[11px] focus-within:ring-[3px]">
        <IconSearch size={16} className="text-muted-foreground shrink-0" />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            onChange({ q: event.target.value }, 'replace');
          }}
          placeholder={t('list.searchPlaceholder')}
          className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-[13.5px] outline-none"
        />
      </label>

      <div
        role="radiogroup"
        className="bg-muted flex shrink-0 gap-0.5 rounded-[10px] p-[3px]"
      >
        {STATUS_CHIPS.map((status) => {
          const on = params.status === status;
          return (
            <button
              key={status ?? 'all'}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange({ status })}
              className={cn(
                'flex h-[30px] items-center gap-1.5 rounded-lg px-[11px] text-[13px] whitespace-nowrap transition-colors',
                on
                  ? 'bg-card text-foreground font-bold shadow-[0_1px_3px_rgba(26,11,46,0.12)]'
                  : 'text-muted-foreground hover:text-foreground font-medium',
              )}
            >
              {t(`list.status.${status ?? 'all'}`)}
              <span
                className={cn(
                  'text-xs font-semibold tabular-nums',
                  on ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {statusCounts[status ?? 'all'].toLocaleString()}
              </span>
            </button>
          );
        })}
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'h-9 gap-[7px] rounded-[10px] px-3 text-[13.5px] font-semibold',
              filterCount > 0 &&
                'border-primary bg-primary/8 text-primary hover:bg-primary/12 hover:text-primary',
            )}
          >
            <IconFilter2 size={16} />
            {t('list.filters.button')}
            {filterCount > 0 && (
              <span className="bg-primary text-primary-foreground flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-[5px] text-[11px] font-bold">
                {filterCount}
              </span>
            )}
            <IconChevronDown size={14} />
          </Button>
        </PopoverTrigger>
        {/* Popper's `align` is physical, not logical: "end" is the start side in RTL. */}
        <PopoverContent
          align={dir === 'rtl' ? 'end' : 'start'}
          dir={dir}
          className="flex w-[310px] flex-col gap-3.5 rounded-[14px] p-3.5"
        >
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs font-bold">
              {t('list.filters.group')}
            </span>
            {groups.length === 0 && (
              <span className="text-muted-foreground py-1 text-[13px]">
                {t('list.filters.noGroups')}
              </span>
            )}
            <div className="flex max-h-[240px] flex-col overflow-y-auto">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="flex h-8 items-center gap-[9px] text-[13.5px]"
                >
                  <span className="size-4 shrink-0">
                    <SelectBox
                      state={params.groups.includes(group.id) ? 'all' : 'none'}
                      label={group.name}
                      onClick={() => toggleGroup(group.id)}
                    />
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className="flex min-w-0 flex-1 items-center gap-[9px] text-start"
                  >
                    <span
                      className={cn(
                        'size-1.5 shrink-0 rounded-full',
                        sideDotClass(group.side),
                      )}
                    />
                    <span className="flex-1 truncate">{group.name}</span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {group.guestCount ?? group.guests.length}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-xs font-bold">
              {t('list.filters.side')}
            </span>
            <div className="bg-muted flex gap-0.5 rounded-[9px] p-[3px]">
              {([null, 'bride', 'groom'] as (GroupSide | null)[]).map(
                (side) => {
                  const on = params.side === side;
                  return (
                    <button
                      key={side ?? 'all'}
                      type="button"
                      onClick={() => onChange({ side })}
                      className={cn(
                        'h-7 flex-1 rounded-[7px] text-[13px]',
                        on
                          ? 'bg-card text-foreground font-bold shadow-[0_1px_3px_rgba(26,11,46,0.12)]'
                          : 'text-muted-foreground font-medium',
                      )}
                    >
                      {side
                        ? t(`list.sides.${side}`)
                        : t('list.filters.sideAll')}
                    </button>
                  );
                },
              )}
            </div>
          </div>

          <label className="flex items-center justify-between border-t pt-3 text-[13.5px] font-medium">
            {t('list.filters.noPhoneOnly')}
            <Switch
              checked={params.noPhone}
              onCheckedChange={(noPhone) => onChange({ noPhone })}
            />
          </label>
        </PopoverContent>
      </Popover>

      <DropdownMenu dir={dir}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-9 gap-[7px] rounded-[10px] px-3 text-[13.5px] font-semibold"
          >
            <IconArrowsSort size={16} />
            {t('list.sort')}
            <IconChevronDown size={14} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={dir === 'rtl' ? 'end' : 'start'}>
          {GUEST_SORT_KEYS.map((key) => (
            <DropdownMenuItem
              key={key}
              onClick={() => onChange({ sort: key })}
              className="gap-2"
            >
              <IconCheck
                size={14}
                className={cn(
                  'shrink-0',
                  params.sort === key ? 'opacity-100' : 'opacity-0',
                )}
              />
              {t(`sort.${key}`)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex-1" />

      <DropdownMenu dir={dir}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            aria-label={t('list.more')}
            className="text-muted-foreground size-9 rounded-[10px]"
          >
            <IconDots size={18} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align={dir === 'rtl' ? 'start' : 'end'}
          className="w-60"
        >
          <DropdownMenuItem onClick={onImportFile} className="gap-2">
            <IconUpload size={16} />
            {t('list.importFile')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onImportDrive} className="gap-2">
            <IconBrandGoogleDrive size={16} />
            {t('list.importDrive')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-muted-foreground text-xs">
            {t('list.exportHeading')}
          </DropdownMenuLabel>
          {(['confirmed', 'confirmedPending', 'all'] as IplanScope[]).map(
            (scope) => (
              <DropdownMenuItem
                key={scope}
                onClick={() => onExport(scope)}
                className="gap-2"
              >
                <IconFileSpreadsheet size={16} />
                {t(
                  `directory.export${scope.charAt(0).toUpperCase()}${scope.slice(1)}`,
                )}
              </DropdownMenuItem>
            ),
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        onClick={onAddGuest}
        className="h-9 gap-1.5 rounded-[10px] px-3.5 text-[13.5px] font-bold"
      >
        <IconPlus size={16} stroke={2.4} />
        {t('list.addGuest')}
      </Button>
    </div>
  );
}
