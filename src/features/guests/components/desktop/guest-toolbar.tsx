'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  IconArrowsSort,
  IconCheck,
  IconFilter2,
  IconSearch,
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { GroupWithGuestsApp, GroupSide } from '@/features/guests/schemas';
import {
  activeFilterCount,
  GUEST_SORT_KEYS,
  type GuestListParams,
} from '@/features/guests/utils/guest-list-params';
import {
  TRANSPORTATION_ANSWERS,
  type TransportationAnswer,
} from '@/features/guests/utils/transportation-summary';
import { cn } from '@/lib/utils';
import { usePublishedHeight } from '@/hooks/use-published-height';
import { SelectBox } from './select-box';
import { SideBadge } from '../side-badge';

interface GuestToolbarProps {
  params: GuestListParams;
  onChange: (
    patch: Partial<GuestListParams>,
    mode?: 'push' | 'replace',
  ) => void;
  /** Records that missed the latest Invitation or Confirmation; the switch shows only while there are some. */
  missedCount: number;
  /** Records that changed their own answer; the switch shows only while there are some. */
  changedCount: number;
  groups: GroupWithGuestsApp[];
  /** The Event asks the transportation question, so its answers can filter the list. */
  showTransportation: boolean;
  /** What the list shows, at the toolbar's end: "163 records · 375 guests". */
  summary: string;
}

/**
 * The table card's own toolbar (Guests table controls design): search, filter,
 * sort and what the list shows. It pins under the page's title and tabs while
 * the list scrolls; the status filter and the data actions live in the row
 * above the card.
 */
export function GuestToolbar({
  params,
  onChange,
  missedCount,
  changedCount,
  groups,
  showTransportation,
  summary,
}: GuestToolbarProps) {
  const t = useTranslations('guests');
  const dir = useLocale() === 'he' ? 'rtl' : 'ltr';
  const filterCount = activeFilterCount(params);
  const ref = useRef<HTMLDivElement>(null);

  // The toolbar wraps when the page is narrow, so its height is not fixed. The
  // table's sticky header sits under it, and reads the height from this.
  usePublishedHeight(ref, '--guest-toolbar-h');

  // The toolbar grows a shadow once it is stuck. It sticks under the pinned
  // title and tabs, not at the viewport's edge, so "stuck" is read off the
  // toolbar itself: the page has scrolled and it has reached its own sticky
  // `top`.
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const toolbar = ref.current;
    if (!toolbar) return;
    let frame = 0;
    const check = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const pinnedAt = parseFloat(getComputedStyle(toolbar).top) || 0;
        setStuck(
          window.scrollY > 0 &&
            toolbar.getBoundingClientRect().top <= pinnedAt + 0.5,
        );
      });
    };
    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, []);

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
    // Full-bleed app-shell backing, so rows never show past the card's rounded
    // top corners or its sides while they scroll under the pinned toolbar.
    <div
      ref={ref}
      className={cn(
        'bg-app-shell sticky top-[calc(var(--page-header-h,0px)+var(--guest-tabs-h,0px))] z-20 -mx-6 px-6 transition-shadow',
        // `box-shadow` directly, not a `shadow-*` utility: globals.css zeroes
        // Tailwind's shadow variables app-wide for the flat look, and this
        // one shadow is the design's cue that the list runs on underneath.
        stuck &&
          '[box-shadow:0_1px_0_var(--border),0_8px_18px_-12px_rgba(26,11,46,0.35)]',
      )}
    >
      <div className="bg-card flex flex-wrap items-center gap-2 rounded-t-[14px] border px-4 py-3">
        <label className="border-input bg-card focus-within:border-ring focus-within:ring-ring/50 flex h-9 max-w-[380px] min-w-40 grow basis-[240px] items-center gap-2 rounded-[10px] border px-[11px] focus-within:ring-[3px]">
          <IconSearch size={16} className="text-muted-foreground shrink-0" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              onChange({ q: event.target.value }, 'replace');
            }}
            placeholder={t('list.searchPlaceholder')}
            aria-label={t('list.searchPlaceholder')}
            className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-[13.5px] outline-none"
          />
        </label>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={filterCount > 0 ? 'soft' : 'outline'}
              className="h-9 gap-[7px] rounded-[10px] px-3 text-[13.5px] font-semibold @max-5xl/guests:px-2.5"
            >
              <IconFilter2 size={16} />
              <span className="@max-5xl/guests:sr-only">
                {t('list.filters.button')}
              </span>
              {filterCount > 0 && (
                <span className="bg-primary text-primary-foreground flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-[5px] text-[11px] font-bold">
                  {filterCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            dir={dir}
            sideOffset={8}
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
                        state={
                          params.groups.includes(group.id) ? 'all' : 'none'
                        }
                        label={group.name}
                        onClick={() => toggleGroup(group.id)}
                      />
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.id)}
                      className="flex min-w-0 flex-1 items-center gap-1.5 text-start"
                    >
                      <span className="truncate">{group.name}</span>
                      <SideBadge side={group.side} />
                      <span className="flex-1" />
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

            {showTransportation && (
              <div className="flex flex-col gap-1.5">
                <span className="text-muted-foreground text-xs font-bold">
                  {t('list.filters.transport')}
                </span>
                <div className="bg-muted flex gap-0.5 rounded-[9px] p-[3px]">
                  {(
                    [
                      null,
                      ...TRANSPORTATION_ANSWERS,
                    ] as (TransportationAnswer | null)[]
                  ).map((answer) => {
                    const on = params.transport === answer;
                    return (
                      <button
                        key={answer ?? 'all'}
                        type="button"
                        onClick={() => onChange({ transport: answer })}
                        className={cn(
                          'h-7 flex-1 rounded-[7px] text-[13px] whitespace-nowrap',
                          on
                            ? 'bg-card text-foreground font-bold shadow-[0_1px_3px_rgba(26,11,46,0.12)]'
                            : 'text-muted-foreground font-medium',
                        )}
                      >
                        {answer
                          ? t(`list.transport.${answer}`)
                          : t('list.filters.transportAll')}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <label className="flex items-center justify-between border-t pt-3 text-[13.5px] font-medium">
              {t('list.filters.noPhoneOnly')}
              <Switch
                checked={params.noPhone}
                onCheckedChange={(noPhone) => onChange({ noPhone })}
              />
            </label>
            {(missedCount > 0 || params.missed) && (
              <label className="flex items-center justify-between gap-3 text-[13.5px] font-medium">
                {t('list.filters.missedLatest', { count: missedCount })}
                <Switch
                  checked={params.missed}
                  onCheckedChange={(missed) => onChange({ missed })}
                />
              </label>
            )}
            {(changedCount > 0 || params.changed) && (
              <label className="flex items-center justify-between gap-3 text-[13.5px] font-medium">
                {t('list.filters.changedAnswer', { count: changedCount })}
                <Switch
                  checked={params.changed}
                  onCheckedChange={(changed) => onChange({ changed })}
                />
              </label>
            )}
          </PopoverContent>
        </Popover>

        <DropdownMenu dir={dir}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="h-9 gap-[7px] rounded-[10px] px-3 text-[13.5px] font-semibold @max-5xl/guests:px-2.5"
            >
              <IconArrowsSort size={16} />
              <span className="@max-5xl/guests:sr-only">
                {t('list.sortWith', { label: t(`sort.${params.sort}`) })}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
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

        <span className="text-muted-foreground ms-auto text-[13px] whitespace-nowrap tabular-nums">
          {summary}
        </span>
      </div>
    </div>
  );
}
