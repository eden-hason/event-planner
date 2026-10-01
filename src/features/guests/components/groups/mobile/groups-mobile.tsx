'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { IconFolder, IconPlus, IconUsersGroup } from '@tabler/icons-react';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Button } from '@/components/ui/button';
import {
  GuestApp,
  GroupWithGuestsApp,
  GroupSide,
} from '@/features/guests/schemas';
import { rsvpPresentation } from '@/features/guests/utils';
import { GroupMobileCard } from './group-mobile-card';
import { PickGroupSheet } from './pick-group-sheet';
import { GroupActionsSheet } from './group-actions-sheet';
import { DeleteGroupSheet } from './delete-group-sheet';
import { GroupUndoToast } from './group-undo-toast';
import { useDeferredGroupDelete } from '@/features/guests/hooks/use-deferred-group-delete';
import { cn } from '@/lib/utils';

interface GroupsMobileProps {
  eventId: string;
  groups: GroupWithGuestsApp[];
  guests: GuestApp[];
  onAddGroup: () => void;
  onOpenAssign: (group: GroupWithGuestsApp) => void;
  onEditGroup: (group: GroupWithGuestsApp) => void;
}

type ChipKey = 'all' | GroupSide | 'none';

export function GroupsMobile({
  eventId,
  groups: allGroups,
  guests: allGuests,
  onAddGroup,
  onOpenAssign,
  onEditGroup,
}: GroupsMobileProps) {
  const t = useTranslations('guests');

  const handleDeleteFailed = useCallback(
    () => toast.error(t('groups.toast.groupDeleteFailed')),
    [t],
  );
  const {
    pending,
    start: startDelete,
    undo: undoDelete,
  } = useDeferredGroupDelete(eventId, handleDeleteFailed);

  // While the delete is held, the group is gone and its records read as
  // unassigned, so the meter and chips already show the result.
  const groups = useMemo(
    () => allGroups.filter((g) => g.id !== pending?.id),
    [allGroups, pending],
  );
  const guests = useMemo(
    () =>
      pending
        ? allGuests.map((g) =>
            g.groupId === pending.id ? { ...g, groupId: null } : g,
          )
        : allGuests,
    [allGuests, pending],
  );

  const [menuGroup, setMenuGroup] = useState<GroupWithGuestsApp | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GroupWithGuestsApp | null>(
    null,
  );

  const [filter, setFilter] = useState<ChipKey>('all');
  const [assignGuest, setAssignGuest] = useState<GuestApp | null>(null);

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

  const assignedPct =
    total > 0 ? Math.round(((total - unassigned) / total) * 100) : 0;
  const other = Math.max(0, total - bride - groom - unassigned);
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);

  const unassignedGuests = useMemo(
    () => guests.filter((g) => !g.groupId),
    [guests],
  );

  const sideGroupCount = (side: GroupSide) =>
    groups.filter((g) => g.side === side).length;

  const filteredGroups = useMemo(
    () =>
      filter === 'bride' || filter === 'groom'
        ? groups.filter((g) => g.side === filter)
        : groups,
    [groups, filter],
  );

  if (groups.length === 0) {
    return (
      <>
        <Empty className="min-h-[400px]">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconUsersGroup className="text-muted-foreground size-6" />
            </EmptyMedia>
            <EmptyTitle>{t('groups.createNew')}</EmptyTitle>
            <EmptyDescription>
              {t('groups.createNewDescription')}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={onAddGroup}>
              <IconPlus size={16} />
              {t('addGroup')}
            </Button>
          </EmptyContent>
        </Empty>
        <GroupUndoToast pending={pending} onUndo={undoDelete} />
      </>
    );
  }

  const pendingTone = rsvpPresentation('pending');
  // Mixed units in one row, as designed: the first three count groups, the
  // last counts guest records.
  const chips: {
    key: ChipKey;
    label: string;
    count: number;
    dotClass?: string;
  }[] = [
    { key: 'all', label: t('groups.mobile.chipAll'), count: groups.length },
    {
      key: 'bride',
      label: t('list.sides.bride'),
      count: sideGroupCount('bride'),
      dotClass: 'bg-primary',
    },
    {
      key: 'groom',
      label: t('list.sides.groom'),
      count: sideGroupCount('groom'),
      dotClass: 'bg-violet-strong',
    },
    {
      key: 'none',
      label: t('groups.mobile.chipNone'),
      count: unassigned,
      dotClass: pendingTone.solid,
    },
  ];

  const listCount =
    filter === 'none'
      ? t('groups.mobile.recordsCount', { count: unassigned })
      : filter === 'all'
        ? t('groups.mobile.groupsCount', { count: filteredGroups.length })
        : t('groups.mobile.showingGroups', {
            shown: filteredGroups.length,
            total: groups.length,
          });

  return (
    <div className="flex flex-col gap-2.5">
      {/* Meter */}
      <div className="bg-card flex flex-col gap-2 rounded-[14px] border px-3.5 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="flex items-baseline gap-1.5">
            <b className="text-xl font-extrabold">{assignedPct}%</b>
            <span className="text-muted-foreground text-[12.5px]">
              {t('groups.mobile.meterLabel')}
            </span>
          </span>
          <span className="text-muted-foreground text-xs">
            {t('groups.mobile.meterLine', {
              groups: groups.length,
              unassigned,
            })}
          </span>
        </div>
        <div className="bg-muted flex h-[7px] gap-0.5 overflow-hidden rounded-full">
          {bride > 0 && (
            <div className="bg-primary" style={{ width: `${pct(bride)}%` }} />
          )}
          {groom > 0 && (
            <div
              className="bg-violet-strong"
              style={{ width: `${pct(groom)}%` }}
            />
          )}
          {other > 0 && (
            <div
              className="bg-muted-foreground/40"
              style={{ width: `${pct(other)}%` }}
            />
          )}
          {unassigned > 0 && (
            <div
              className={pendingTone.solid}
              style={{ width: `${pct(unassigned)}%` }}
            />
          )}
        </div>
      </div>

      {/* Filter chips: a single-select row, not a toggle plus a filter */}
      <div className="scrollbar-hide flex gap-1.5 overflow-x-auto">
        {chips.map((chip) => {
          const on = filter === chip.key;
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => setFilter(chip.key)}
              className={cn(
                'flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] whitespace-nowrap',
                on
                  ? 'border-primary bg-primary/10 text-primary font-bold'
                  : 'bg-card text-muted-foreground font-medium',
              )}
            >
              {chip.dotClass && (
                <span className={cn('size-1.5 rounded-full', chip.dotClass)} />
              )}
              {chip.label}
              <span className="font-bold">{chip.count}</span>
            </button>
          );
        })}
      </div>

      {filter !== 'none' && (
        <>
          <div className="text-muted-foreground px-0.5 text-[12.5px]">
            {listCount}
          </div>
          <div className="flex flex-col gap-[7px] pb-2">
            {filteredGroups.map((group) => (
              <GroupMobileCard
                key={group.id}
                group={group}
                onSelect={() => onOpenAssign(group)}
                onOpenMenu={() => setMenuGroup(group)}
                menuOpen={menuGroup?.id === group.id}
              />
            ))}
            {filteredGroups.length === 0 && (
              <div className="text-muted-foreground py-6 text-center text-[13px]">
                {t('groups.mobile.emptySide')}
              </div>
            )}
          </div>
        </>
      )}

      {filter === 'none' && (
        <>
          {unassigned > 0 && (
            <div
              className={cn(
                'flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] leading-snug font-semibold',
                pendingTone.chip,
              )}
            >
              <IconFolder size={17} className="shrink-0" />
              <span className="flex-1">
                {t('groups.mobile.unassignedBanner', { count: unassigned })}
              </span>
            </div>
          )}
          <div className="text-muted-foreground px-0.5 text-[12.5px]">
            {listCount}
          </div>
          <div className="flex flex-col gap-[7px] pb-2">
            {unassignedGuests.map((guest) => (
              <div
                key={guest.id}
                className="bg-card flex h-[72px] items-center gap-2.5 rounded-[14px] border ps-2.5 pe-3"
              >
                <span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-full text-base font-bold">
                  {guest.name.charAt(0).toUpperCase()}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[15px] font-bold">
                    {guest.name}
                  </span>
                  <div className="text-muted-foreground flex items-center gap-1.5 text-[12.5px]">
                    <span
                      dir="ltr"
                      className={cn(
                        'whitespace-nowrap',
                        !guest.phone && 'text-destructive/70',
                      )}
                    >
                      {guest.phone || t('filters.noPhone')}
                    </span>
                    <span>·</span>
                    <span className="whitespace-nowrap">
                      {t('mobile.seats', { count: guest.amount })}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAssignGuest(guest)}
                  className="bg-primary/10 text-primary flex h-[34px] shrink-0 items-center gap-1.5 rounded-[10px] px-3 text-[13.5px] font-bold"
                >
                  <IconFolder size={15} />
                  {t('groups.mobile.assignButton')}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <GroupActionsSheet
        group={menuGroup}
        onOpenChange={(open) => !open && setMenuGroup(null)}
        onEdit={(group) => {
          setMenuGroup(null);
          onEditGroup(group);
        }}
        onAssign={(group) => {
          setMenuGroup(null);
          onOpenAssign(group);
        }}
        onDelete={(group) => {
          setMenuGroup(null);
          setDeleteTarget(group);
        }}
      />

      <DeleteGroupSheet
        group={deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={(group) => {
          setDeleteTarget(null);
          startDelete({
            id: group.id,
            name: group.name,
            recordCount: group.guestCount,
          });
        }}
      />

      <GroupUndoToast pending={pending} onUndo={undoDelete} />

      <PickGroupSheet
        eventId={eventId}
        guest={assignGuest}
        groups={groups}
        onOpenChange={(open) => !open && setAssignGuest(null)}
      />
    </div>
  );
}
