'use client';

import * as React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useTranslations } from 'next-intl';
import { Search, HelpCircle, ChevronDown, Sparkles, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GuestCard } from './guest-card';
import { groupColor } from '../utils/group-color';
import type { GuestWithGroupApp } from '@/features/guests/schemas';
import type { TableShape } from '../schemas';

interface UnassignedGuestsPanelProps {
  guests: GuestWithGroupApp[];
  groups: Array<{ id: string; name: string; icon: string | null }>;
  onAddTableClick: () => void;
  onAddTableWithShape: (shape: TableShape) => void;
  onAddGuestClick: () => void;
}

const RSVP_SECTIONS: Array<{
  status: GuestWithGroupApp['rsvpStatus'];
  dotClass: string;
  labelKey: string;
}> = [
  { status: 'confirmed', dotClass: 'bg-emerald-500', labelKey: 'sections.confirmed' },
  { status: 'pending', dotClass: 'bg-amber-400', labelKey: 'sections.pending' },
];

export function UnassignedGuestsPanel({
  guests,
  groups,
  onAddTableClick,
  onAddTableWithShape,
  onAddGuestClick,
}: UnassignedGuestsPanelProps) {
  const t = useTranslations('seating');
  const [search, setSearch] = React.useState('');
  const [groupFilter, setGroupFilter] = React.useState<string>('all');
  const searchRef = React.useRef<HTMLInputElement>(null);

  const { setNodeRef, isOver } = useDroppable({
    id: 'unassigned-panel',
    data: { type: 'unassigned' },
  });

  // ⌘K / Ctrl+K focuses the search input
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const totalHeadCount = guests.reduce((s, g) => s + g.amount, 0);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return guests.filter((g) => {
      if (q && !g.name.toLowerCase().includes(q)) return false;
      if (groupFilter === 'all') return true;
      if (groupFilter === 'none') return !g.groupId;
      return g.groupId === groupFilter;
    });
  }, [guests, search, groupFilter]);

  // Group into sections, sorted by status
  const sections = RSVP_SECTIONS.map(({ status, dotClass, labelKey }) => ({
    status,
    dotClass,
    label: t(labelKey),
    guests: filtered
      .filter((g) => g.rsvpStatus === status)
      .sort((a, b) => a.name.localeCompare(b.name)),
  })).filter((s) => s.guests.length > 0);

  // Any guests with statuses not in sections (e.g. declined)
  const otherGuests = filtered.filter(
    (g) => !RSVP_SECTIONS.some((s) => s.status === g.rsvpStatus),
  );

  return (
    <TooltipProvider>
      <aside className="flex w-72 shrink-0 flex-col border-e bg-card">
        {/* Header */}
        <div className="border-b p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">{t('unassigned.title')}</h2>
              <span className="rounded-full border bg-muted px-2 py-0.5 text-xs text-muted-foreground tabular-nums">
                {guests.length} · {totalHeadCount}p
              </span>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground hover:text-foreground">
                  <HelpCircle className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-48 text-xs">
                {t('unassigned.help')}
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="ps-8 pe-12"
            />
            <kbd className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </div>

          {/* Group chips */}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setGroupFilter('all')}
              className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
                groupFilter === 'all'
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              {t('filterAllGroups')}
            </button>
            {groups.map((g) => {
              const color = groupColor(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGroupFilter(groupFilter === g.id ? 'all' : g.id)}
                  className={cn(
                    'flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
                    groupFilter === g.id
                      ? 'bg-foreground text-background'
                      : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: color.bg }}
                  />
                  {g.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Guest list */}
        <div
          ref={setNodeRef}
          className={cn(
            'flex-1 overflow-y-auto p-2 space-y-1 transition-colors',
            isOver && 'bg-primary/5',
          )}
        >
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              {guests.length === 0 ? t('unassigned.empty') : t('unassigned.noMatches')}
            </p>
          ) : (
            <>
              {sections.map(({ status, dotClass, label, guests: sectionGuests }) => (
                <RsvpSection
                  key={status}
                  dotClass={dotClass}
                  label={label}
                  count={sectionGuests.length}
                  guests={sectionGuests}
                />
              ))}
              {otherGuests.map((g) => (
                <GuestCard key={g.id} guest={g} />
              ))}
            </>
          )}
        </div>

        {/* Bottom CTA bar */}
        <div className="border-t p-2 flex flex-col gap-2">
          {/* Add Table split button */}
          <div className="flex w-full">
            <Button
              size="sm"
              className="flex-1 rounded-e-none"
              onClick={onAddTableClick}
            >
              + {t('addTable')}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="rounded-s-none border-s border-primary-foreground/20 px-2"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => onAddTableWithShape('round')}>
                  {t('shapes.round')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAddTableWithShape('square')}>
                  {t('shapes.square')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAddTableWithShape('rectangle')}>
                  {t('shapes.rectangle')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Auto-seat + Add Guest row */}
          <div className="flex gap-2">
            {/* Auto-seat stub */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="outline" disabled className="flex-1 gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t('autoSeat.label')}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">{t('autoSeat.stubTooltip')}</TooltipContent>
            </Tooltip>

            {/* Add Guest */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" onClick={onAddGuestClick} className="px-2">
                  <UserPlus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">{t('addGuest')}</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}

function RsvpSection({
  dotClass,
  label,
  count,
  guests,
}: {
  dotClass: string;
  label: string;
  count: number;
  guests: GuestWithGroupApp[];
}) {
  const [open, setOpen] = React.useState(true);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:bg-muted/50 transition-colors">
        <span className={cn('h-1.5 w-1.5 rounded-full', dotClass)} />
        <span className="flex-1 text-start">{label}</span>
        <span className="tabular-nums">{count}</span>
        <ChevronDown
          className={cn('h-3.5 w-3.5 transition-transform', !open && '-rotate-90')}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1.5 pb-1 pt-0.5">
        {guests.map((g) => (
          <GuestCard key={g.id} guest={g} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
