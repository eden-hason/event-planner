'use client';

import { useEffect, useMemo, useState } from 'react';
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
  GroupSide,
  GroupWithGuestsApp,
} from '@/features/guests/schemas';
import { rsvpPresentation } from '@/features/guests/utils';
import {
  draftChanges,
  groupAssignmentStats,
  withoutPendingDeletes,
} from '@/features/guests/utils/group-assignment';
import {
  pruneSelection,
  withoutIds,
} from '@/features/guests/utils/guest-selection';
import { useDeferredGroupDelete } from '@/features/guests/hooks/use-deferred-group-delete';
import { useGroupWrites } from '@/features/guests/hooks/use-group-writes';
import { cn } from '@/lib/utils';
import { sideSolidClass } from '../../side-badge';
import { GroupUndoToast } from '../group-undo-toast';
import { AssignPanel } from './assign-panel';
import { DeleteGroupDialog, DiscardDraftDialog } from './confirm-dialogs';
import { GroupDialog } from './group-dialog';
import { GroupListItem } from './group-list-item';
import { UnassignedPanel } from './unassigned-panel';

type SideChip = 'all' | GroupSide;

/** Centred at the foot of the detail card, clear of its Save bar. */
const UNDO_TOAST_CLASS =
  'absolute inset-x-0 bottom-[84px] mx-auto w-[460px] max-w-[calc(100%-32px)]';

type View = { kind: 'group'; id: string | null } | { kind: 'unassigned' };
type Draft = { groupId: string; ids: Set<string> };
type DialogTarget =
  | { mode: 'edit'; group: GroupWithGuestsApp }
  | { mode: 'create'; preassign: GuestApp[] };

/**
 * Desktop's Groups tab as list and detail: the groups stay in a column on the
 * side, and the selected one opens for assigning in two columns ("no group"
 * and "in the group") with + / − as a draft and Save at the end. "No group" is
 * a fixed row at the foot of the list, opening its own list of records. The
 * phone's bottom sheets are centred dialogs here, and ⋯ a popover menu.
 */
export function GroupsDesktop({
  eventId,
  groups: allGroups,
  guests: allGuests,
  createOpen,
  onCreateOpenChange,
  onShowInGuests,
}: {
  eventId: string;
  groups: GroupWithGuestsApp[];
  guests: GuestApp[];
  /** The page header's "New group" button opens the create dialog. */
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  /** Switch to the Guests tab, filtered to this group. */
  onShowInGuests: (groupId: string) => void;
}) {
  const t = useTranslations('guests');
  const groupWrites = useGroupWrites(eventId);

  const {
    pending: pendingDelete,
    hiddenIds,
    start: startDelete,
    undo: undoDelete,
  } = useDeferredGroupDelete(eventId, () =>
    toast.error(t('groups.toast.groupDeleteFailed')),
  );

  // Records assigned from the Unassigned view leave it at once, before the
  // refreshed list arrives. Each id drops out of here once that refresh shows
  // it in a group, so a record later taken out of a group shows up again.
  const [assigning, setAssigning] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => {
    setAssigning((prev) =>
      prev.size === 0
        ? prev
        : pruneSelection(
            prev,
            allGuests.filter((g) => !g.groupId).map((g) => g.id),
          ),
    );
  }, [allGuests]);
  const unhide = (ids: string[]) =>
    setAssigning((prev) => withoutIds(prev, ids));

  // While a delete is held its group is gone and its records read as
  // unassigned, so the meter and the lists already show the result.
  const { groups, guests } = useMemo(
    () => withoutPendingDeletes(allGroups, allGuests, hiddenIds),
    [allGroups, allGuests, hiddenIds],
  );
  const unassignedGuests = useMemo(
    () => guests.filter((g) => !g.groupId && !assigning.has(g.id)),
    [guests, assigning],
  );
  const stats = useMemo(
    () => groupAssignmentStats(guests, groups),
    [guests, groups],
  );

  const [filter, setFilter] = useState<SideChip>('all');
  const [view, setView] = useState<View>({ kind: 'group', id: null });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [leaveTo, setLeaveTo] = useState<(() => void) | null>(null);
  const [dialog, setDialog] = useState<DialogTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GroupWithGuestsApp | null>(
    null,
  );

  const filteredGroups =
    filter === 'all' ? groups : groups.filter((g) => g.side === filter);

  // An unknown or deleted id falls back to the first group shown.
  const selectedGroup =
    view.kind === 'group'
      ? (groups.find((g) => g.id === view.id) ??
        filteredGroups[0] ??
        groups[0] ??
        null)
      : null;

  const savedIds = useMemo(
    () => new Set(selectedGroup?.guests.map((g) => g.id) ?? []),
    [selectedGroup],
  );
  const draftIds =
    selectedGroup && draft?.groupId === selectedGroup.id ? draft.ids : savedIds;
  const changes = draftChanges(savedIds, draftIds);

  /** Runs `go` now, or after the Owner agrees to drop an unsaved draft. */
  const leave = (go: () => void) => {
    if (changes.dirty) setLeaveTo(() => go);
    else go();
  };

  const openGroup = (id: string) => {
    if (view.kind === 'group' && selectedGroup?.id === id) return;
    leave(() => {
      setDraft(null);
      setView({ kind: 'group', id });
    });
  };

  const openUnassigned = () => {
    if (view.kind === 'unassigned') return;
    leave(() => {
      setDraft(null);
      setView({ kind: 'unassigned' });
    });
  };

  const handleSave = async () => {
    if (!selectedGroup || !changes.dirty) return;
    setSaving(true);
    const saved = await groupWrites.saveMembers(
      selectedGroup,
      [...draftIds],
      [...savedIds],
    );
    // The draft stays until the write lands, so the columns never flash back
    // to the old members while it is in flight.
    if (saved) setDraft(null);
    setSaving(false);
  };

  const assignRecords = async (
    targets: GuestApp[],
    group: GroupWithGuestsApp,
  ) => {
    const ids = targets.map((g) => g.id);
    setAssigning((prev) => new Set([...prev, ...ids]));
    if (!(await groupWrites.assign(targets, group))) unhide(ids);
  };

  const handleDialogSubmit = async (
    formData: FormData,
    { openAfter }: { openAfter: boolean },
  ) => {
    if (dialog?.mode === 'edit') {
      void groupWrites.update(formData);
      return;
    }
    const preassign = dialog?.mode === 'create' ? dialog.preassign : [];
    const ids = preassign.map((g) => g.id);
    if (ids.length > 0) setAssigning((prev) => new Set([...prev, ...ids]));
    const groupId = await groupWrites.create(formData, preassign);
    if (!groupId) unhide(ids);
    else if (openAfter || ids.length > 0) openGroup(groupId);
  };

  const dialogOpen = createOpen || dialog !== null;
  const closeDialog = () => {
    setDialog(null);
    onCreateOpenChange(false);
  };

  const groupDialog = (
    <GroupDialog
      open={dialogOpen}
      onOpenChange={(open) => !open && closeDialog()}
      group={dialog?.mode === 'edit' ? dialog.group : null}
      unassignedCount={unassignedGuests.length}
      preassignCount={dialog?.mode === 'create' ? dialog.preassign.length : 0}
      onSubmit={handleDialogSubmit}
    />
  );

  if (groups.length === 0) {
    return (
      <div className="relative">
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
            <Button onClick={() => onCreateOpenChange(true)}>
              <IconPlus size={16} />
              {t('addGroup')}
            </Button>
          </EmptyContent>
        </Empty>
        <GroupUndoToast
          pending={pendingDelete}
          onUndo={undoDelete}
          className={UNDO_TOAST_CLASS}
        />
        {groupDialog}
      </div>
    );
  }

  const pending = rsvpPresentation('pending');
  const pct = (n: number) => (stats.total > 0 ? (n / stats.total) * 100 : 0);
  const sideCount = (side: GroupSide) =>
    groups.filter((g) => g.side === side).length;

  const legend = [
    { label: t('list.sides.bride'), n: stats.bride, dot: sideSolidClass('bride') },
    { label: t('list.sides.groom'), n: stats.groom, dot: sideSolidClass('groom') },
    { label: t('groups.desktop.legendShared'), n: stats.shared, dot: 'bg-muted-foreground/40' },
    { label: t('groups.mobile.chipNone'), n: stats.unassigned, dot: pending.solid },
  ];

  const chips: { key: SideChip; label: string; count: number; dot?: string }[] = [
    { key: 'all', label: t('groups.mobile.chipAll'), count: groups.length },
    {
      key: 'bride',
      label: t('list.sides.bride'),
      count: sideCount('bride'),
      dot: sideSolidClass('bride'),
    },
    {
      key: 'groom',
      label: t('list.sides.groom'),
      count: sideCount('groom'),
      dot: sideSolidClass('groom'),
    },
  ];

  return (
    <div className="flex flex-col gap-3.5">
      {/* Meter: share of records in a group, by side */}
      <div className="flex items-center gap-[22px] pt-1">
        <div className="flex shrink-0 items-baseline gap-1.5">
          <span className="text-[26px] leading-none font-extrabold tabular-nums">
            {stats.assignedPct}%
          </span>
          <span className="text-muted-foreground text-[13px]">
            {t('groups.mobile.meterLabel')}
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-[7px]">
          <div className="bg-muted flex h-2 gap-0.5 overflow-hidden rounded-full">
            {legend.map(
              (item) =>
                item.n > 0 && (
                  <div
                    key={item.label}
                    className={item.dot}
                    style={{ width: `${pct(item.n)}%` }}
                  />
                ),
            )}
          </div>
          <div className="text-muted-foreground flex justify-between gap-3 text-[12.5px]">
            <div className="flex gap-4">
              {legend.map((item) => (
                <span key={item.label} className="inline-flex items-center gap-1.5">
                  <span className={cn('size-[7px] rounded-full', item.dot)} />
                  {item.label}
                  <b className="text-foreground font-bold">{item.n}</b>
                </span>
              ))}
            </div>
            <span>
              {t('groups.desktop.meterLine', {
                groups: groups.length,
                total: stats.total,
              })}
            </span>
          </div>
        </div>
      </div>

      <div className="flex h-[max(560px,calc(100dvh_-_var(--page-header-h,0px)_-_var(--guest-tabs-h,0px)_-_150px))] gap-[18px]">
        {/* Master: the groups, then the fixed "no group" row. Narrower below
            2xl, so the two assign columns keep room for names. */}
        <div className="flex min-h-0 w-[240px] shrink-0 flex-col gap-2.5 xl:w-[280px] 2xl:w-[340px]">
          <div className="bg-muted flex gap-0.5 rounded-[10px] p-[3px]">
            {chips.map((chip) => {
              const on = filter === chip.key;
              return (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => setFilter(chip.key)}
                  className={cn(
                    'flex h-[30px] flex-1 items-center justify-center gap-1.5 rounded-lg text-[13px] whitespace-nowrap transition-colors',
                    on
                      ? 'bg-card text-foreground font-bold shadow-sm'
                      : 'text-muted-foreground font-medium',
                  )}
                >
                  {chip.dot && (
                    <span className={cn('size-1.5 rounded-full', chip.dot)} />
                  )}
                  {chip.label}
                  <span
                    className={cn(
                      'text-xs font-semibold',
                      on ? 'text-primary' : 'text-muted-foreground',
                    )}
                  >
                    {chip.count}
                  </span>
                </button>
              );
            })}
          </div>
          <span className="text-muted-foreground px-1 text-[12.5px]">
            {filter === 'all'
              ? t('groups.mobile.groupsCount', { count: filteredGroups.length })
              : t('groups.mobile.showingGroups', {
                  shown: filteredGroups.length,
                  total: groups.length,
                })}
          </span>
          <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-1">
            {filteredGroups.map((group) => (
              <GroupListItem
                key={group.id}
                group={group}
                selected={view.kind === 'group' && selectedGroup?.id === group.id}
                onSelect={() => openGroup(group.id)}
                onEdit={() => setDialog({ mode: 'edit', group })}
                onShowInGuests={() => leave(() => onShowInGuests(group.id))}
                onDelete={() => setDeleteTarget(group)}
              />
            ))}
            {filteredGroups.length === 0 && (
              <div className="text-muted-foreground py-6 text-center text-[13px]">
                {t('groups.mobile.emptySide')}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={openUnassigned}
            className={cn(
              'flex h-14 shrink-0 items-center gap-2.5 rounded-xl border border-dashed ps-2.5 pe-3 text-start transition-colors',
              view.kind === 'unassigned'
                ? cn(pending.activeSurface, 'border-solid')
                : 'bg-card hover:bg-accent/40',
            )}
          >
            <span
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-[10px]',
                pending.chip,
              )}
            >
              <IconFolder size={18} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-px">
              <span className="text-[14.5px] font-bold">
                {t('groups.mobile.chipNone')}
              </span>
              <span className="text-muted-foreground text-xs">
                {t('groups.desktop.unassignedRowSub')}
              </span>
            </div>
            <span
              className={cn(
                'text-[15px] font-extrabold tabular-nums',
                pending.text,
              )}
            >
              {unassignedGuests.length}
            </span>
          </button>
        </div>

        {/* Detail */}
        <div className="bg-card relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border">
          {view.kind === 'group' && selectedGroup && (
            <AssignPanel
              key={selectedGroup.id}
              group={selectedGroup}
              unassignedGuests={unassignedGuests}
              totalRecords={stats.total}
              saved={savedIds}
              draft={draftIds}
              changes={changes}
              onDraftChange={(ids) =>
                setDraft({ groupId: selectedGroup.id, ids })
              }
              saving={saving}
              onSave={handleSave}
              onEdit={() => setDialog({ mode: 'edit', group: selectedGroup })}
            />
          )}
          {view.kind === 'unassigned' && (
            <UnassignedPanel
              guests={unassignedGuests}
              groups={groups}
              onAssign={assignRecords}
              onNewGroup={(targets) =>
                setDialog({ mode: 'create', preassign: targets })
              }
            />
          )}
          <GroupUndoToast
            pending={pendingDelete}
            onUndo={undoDelete}
            className={UNDO_TOAST_CLASS}
          />
        </div>
      </div>

      {groupDialog}

      <DeleteGroupDialog
        group={deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={(group) => {
          setDeleteTarget(null);
          if (draft?.groupId === group.id) setDraft(null);
          if (view.kind === 'group' && selectedGroup?.id === group.id) {
            setView({ kind: 'group', id: null });
          }
          startDelete({
            id: group.id,
            name: group.name,
            recordCount: group.guestCount,
          });
        }}
      />

      <DiscardDraftDialog
        draft={
          leaveTo && selectedGroup
            ? {
                groupName: selectedGroup.name,
                added: changes.added,
                removed: changes.removed,
              }
            : null
        }
        onKeepEditing={() => setLeaveTo(null)}
        onDiscard={() => {
          const go = leaveTo;
          setLeaveTo(null);
          setDraft(null);
          go?.();
        }}
      />
    </div>
  );
}
