'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { IconPlus, IconUsersGroup } from '@tabler/icons-react';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Button } from '@/components/ui/button';
import { GuestApp, GroupWithGuestsApp, GroupSide } from '@/features/guests/schemas';
import { rsvpPresentation } from '@/features/guests/utils';
import { deleteGroups } from '@/features/guests/actions/groups';
import { GroupMobileCard } from './group-mobile-card';
import { cn } from '@/lib/utils';

interface GroupsMobileProps {
  eventId: string;
  groups: GroupWithGuestsApp[];
  guests: GuestApp[];
  onAddGroup: () => void;
  onOpenAssign: (group: GroupWithGuestsApp) => void;
}

type TileKey = 'bride' | 'groom' | 'unassigned';

export function GroupsMobile({
  eventId,
  groups,
  guests,
  onAddGroup,
  onOpenAssign,
}: GroupsMobileProps) {
  const t = useTranslations('guests');

  const [sideFilter, setSideFilter] = useState<GroupSide | null>(null);
  const [showUnassigned, setShowUnassigned] = useState(false);

  // Counted by which group's side a guest belongs to - not the guest's own
  // `side` field, which is a separate concept used on the Guests tab. This
  // matches how the desktop side filter already reads groups (`group.side`),
  // just applied to their members here.
  const { bride, groom, unassigned, total } = useMemo(() => {
    const sideByGroupId = new Map(groups.map((g) => [g.id, g.side]));
    let brideCount = 0;
    let groomCount = 0;
    let unassignedCount = 0;
    for (const guest of guests) {
      if (!guest.groupId) {
        unassignedCount++;
        continue;
      }
      const side = sideByGroupId.get(guest.groupId);
      if (side === 'bride') brideCount++;
      else if (side === 'groom') groomCount++;
    }
    return {
      bride: brideCount,
      groom: groomCount,
      unassigned: unassignedCount,
      total: guests.length,
    };
  }, [guests, groups]);

  const assignedPct = total > 0 ? Math.round(((total - unassigned) / total) * 100) : 0;
  const other = Math.max(0, total - bride - groom - unassigned);
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);

  const unassignedGuests = useMemo(() => guests.filter((g) => !g.groupId), [guests]);

  const filteredGroups = useMemo(
    () => (sideFilter ? groups.filter((g) => g.side === sideFilter) : groups),
    [groups, sideFilter],
  );

  const handleDeleteGroup = (group: GroupWithGuestsApp) => {
    const promise = deleteGroups(eventId, group.id).then((result) => {
      if (!result.success) {
        throw new Error(result.message || t('groups.toast.groupDeleteFailed'));
      }
      return result;
    });

    toast.promise(promise, {
      loading: t('groups.toast.deletingGroup', { name: group.name }),
      success: () => t('groups.toast.groupDeleted'),
      error: (err) =>
        err instanceof Error ? err.message : t('groups.toast.groupDeleteFailed'),
    });
  };

  if (groups.length === 0) {
    return (
      <Empty className="min-h-[400px]">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconUsersGroup className="text-muted-foreground size-6" />
          </EmptyMedia>
          <EmptyTitle>{t('groups.createNew')}</EmptyTitle>
          <EmptyDescription>{t('groups.createNewDescription')}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={onAddGroup}>
            <IconPlus size={16} />
            {t('addGroup')}
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  const tiles: { key: TileKey; label: string; count: number; dotClass: string }[] = [
    { key: 'bride', label: t('groups.mobile.tileBride'), count: bride, dotClass: 'bg-primary' },
    { key: 'groom', label: t('groups.mobile.tileGroom'), count: groom, dotClass: 'bg-blue-500' },
    {
      key: 'unassigned',
      label: t('groups.mobile.tileUnassigned'),
      count: unassigned,
      dotClass: 'bg-amber-500',
    },
  ];

  const activeTint: Record<TileKey, string> = {
    bride: 'border-primary/50 bg-primary/10 text-primary',
    groom: 'border-blue-500/50 bg-blue-50 text-blue-600',
    unassigned:
      'border-amber-500/50 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300',
  };

  return (
    <div className="flex flex-col gap-3.5">
      {/* Stats card */}
      <div className="bg-card flex flex-col gap-3 rounded-xl border p-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="flex items-baseline gap-2">
            <span
              className={cn(
                'text-[32px] leading-none font-bold tracking-tight',
                unassigned > 0 ? 'text-amber-600' : rsvpPresentation('confirmed').text,
              )}
            >
              {unassigned}
            </span>
            <span className="text-sm font-semibold">{t('groups.mobile.unassignedLabel')}</span>
          </span>
          <span className="text-muted-foreground text-[13px] whitespace-nowrap">
            {t('groups.mobile.assignedPct', { pct: assignedPct })}
          </span>
        </div>

        {/* Segmented meter */}
        <div className="bg-muted flex h-2 gap-0.5 overflow-hidden rounded-full">
          {bride > 0 && <div className="bg-primary" style={{ width: `${pct(bride)}%` }} />}
          {groom > 0 && <div className="bg-blue-500" style={{ width: `${pct(groom)}%` }} />}
          {other > 0 && (
            <div className="bg-muted-foreground/40" style={{ width: `${pct(other)}%` }} />
          )}
          {unassigned > 0 && (
            <div className="bg-amber-500" style={{ width: `${pct(unassigned)}%` }} />
          )}
        </div>

        {/* Tiles - double as the side filter and the unassigned toggle */}
        <div className="grid grid-cols-3 gap-1.5">
          {tiles.map((tile) => {
            const active = tile.key === 'unassigned' ? showUnassigned : sideFilter === tile.key;
            return (
              <button
                key={tile.key}
                type="button"
                onClick={() =>
                  tile.key === 'unassigned'
                    ? setShowUnassigned((v) => !v)
                    : setSideFilter((prev) => (prev === tile.key ? null : (tile.key as GroupSide)))
                }
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-[10px] border bg-transparent px-1 py-2 transition-colors',
                  active ? activeTint[tile.key] : 'border-border',
                )}
              >
                <span
                  className={cn(
                    'flex items-center gap-1.5 text-[12px]',
                    !active && 'text-muted-foreground',
                  )}
                >
                  <span className={cn('size-1.5 rounded-full', tile.dotClass)} />
                  {tile.label}
                </span>
                <span className={cn('text-[17px] font-bold', !active && 'text-foreground')}>
                  {tile.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Awaiting assignment panel */}
      {showUnassigned && (
        <div className="overflow-hidden rounded-xl border border-amber-300/70 dark:border-amber-800/60">
          <div className="flex items-center justify-between bg-amber-50 px-3.5 py-2.5 dark:bg-amber-950/30">
            <span className="text-[13px] font-semibold text-amber-800 dark:text-amber-300">
              {t('groups.mobile.awaitingAssignment')}
            </span>
            <span className="text-[12px] text-amber-800/80 dark:text-amber-300/80">
              {t('groups.mobile.tapToAssignHint')}
            </span>
          </div>
          <div className="bg-card flex flex-col">
            {unassignedGuests.map((guest) => (
              <div
                key={guest.id}
                className="flex items-center gap-2.5 border-t px-3.5 py-2.5 first:border-t-0"
              >
                <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold">
                  {guest.name.charAt(0).toUpperCase()}
                </span>
                <span className="flex-1 truncate text-sm font-medium">{guest.name}</span>
                <span className="text-muted-foreground text-xs">
                  {t('mobile.seats', { count: guest.amount })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* List header */}
      <div className="flex items-center justify-between px-0.5">
        <span className="text-sm font-semibold">
          {sideFilter
            ? t('groups.mobile.sideGroups', {
                side: t(`sides.${sideFilter}` as 'sides.bride' | 'sides.groom'),
                count: filteredGroups.length,
              })
            : t('groups.mobile.allGroups', { count: filteredGroups.length })}
        </span>
        {sideFilter && (
          <button
            type="button"
            onClick={() => setSideFilter(null)}
            className="text-primary text-[13px] font-medium"
          >
            {t('groups.mobile.showAll')}
          </button>
        )}
      </div>

      {/* Groups list */}
      <div className="flex flex-col gap-2">
        {filteredGroups.map((group) => (
          <GroupMobileCard
            key={group.id}
            group={group}
            onSelect={() => onOpenAssign(group)}
            onDelete={() => handleDeleteGroup(group)}
          />
        ))}
        {filteredGroups.length === 0 && (
          <div className="text-muted-foreground py-6 text-center text-[13px]">
            {t('groups.mobile.emptySide')}
          </div>
        )}
      </div>
    </div>
  );
}
