'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePublishedHeight } from '@/hooks/use-published-height';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  IconBrandGoogleDrive,
  IconSearch,
  IconUpload,
  IconUserPlus,
  IconUsers,
  IconX,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import type {
  GroupWithGuestsApp,
  GuestWithGroupApp,
} from '@/features/guests/schemas';
import type { TableOption } from '@/features/seating';
import {
  exportGuestsToIplan,
  filterAndSortGuests,
  scopeToGuestIssue,
  type IplanScope,
  type RsvpStatus,
} from '@/features/guests/utils';
import {
  assignGuestsToGroup,
  setGuestsRsvpStatus,
  setGuestsSideValue,
  type BulkGuestsState,
} from '@/features/guests/actions/bulk';
import { useGuestListParams } from '@/features/guests/hooks/use-guest-list-params';
import { useDeferredDelete } from '@/features/guests/hooks/use-deferred-delete';
import { deleteImpact, rsvpImpact } from '@/features/guests/utils/bulk-impact';
import {
  headerState,
  hiddenCount,
  pruneSelection,
  selectRange,
  toggleAllVisible,
  toggleOne,
} from '@/features/guests/utils/guest-selection';
import { ImportGuestsDialog } from '../groups';
import { RsvpMeter } from './rsvp-meter';
import { GuestToolbar } from './guest-toolbar';
import { ActiveFilterChips } from './active-filter-chips';
import { GuestTable } from './guest-table';
import { BulkActionBar, type BulkAction } from './bulk-action-bar';
import {
  GuestConfirmDialog,
  type ConfirmRequest,
} from './guest-confirm-dialog';
import { UndoToast } from './undo-toast';
import { NewGroupDialog } from './new-group-dialog';
import { GuestDrawer } from './guest-drawer';
import type { RowAction } from './guest-row-menu';

interface GuestsDesktopProps {
  guests: GuestWithGroupApp[];
  groups: GroupWithGuestsApp[];
  eventId: string;
  eventName?: string;
  existingPhones: Map<string, string>;
  /** Guest Records a Delivery has reached - named in the delete confirm. */
  messagedGuestIds: string[];
  showDietary: boolean;
  tables: TableOption[];
  drawer: {
    open: boolean;
    guest: GuestWithGroupApp | null;
    onOpenChange: (open: boolean) => void;
  };
  onOpenGuest: (guest: GuestWithGroupApp) => void;
  onAddGuest: () => void;
  onImportDrive: () => void;
}

/**
 * The desktop Guests tab: one continuous list, one selection, and one set of
 * actions that work the same on a row and on a selection (Guests Desktop
 * design, docs/design/guests-page-brief.md).
 */
export function GuestsDesktop({
  guests: allGuests,
  groups,
  eventId,
  eventName,
  existingPhones,
  messagedGuestIds,
  showDietary,
  tables,
  drawer,
  onOpenGuest,
  onAddGuest,
  onImportDrive,
}: GuestsDesktopProps) {
  const t = useTranslations('guests');
  const { params, update, reset } = useGuestListParams();
  const deferred = useDeferredDelete(eventId);

  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const anchorRef = useRef<string | null>(null);
  const [selectionOnly, setSelectionOnly] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [newGroupFor, setNewGroupFor] = useState<string[] | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [recentlyUpdatedId, setRecentlyUpdatedId] = useState<string | null>(
    null,
  );

  // Rows waiting on the Undo toast are already gone as far as the Owner sees.
  const guests = useMemo(
    () => allGuests.filter((guest) => !deferred.hiddenIds.has(guest.id)),
    [allGuests, deferred.hiddenIds],
  );

  // Records that stop existing drop out of the selection.
  useEffect(() => {
    setSelected((prev) =>
      pruneSelection(
        prev,
        guests.map((guest) => guest.id),
      ),
    );
  }, [guests]);

  const scoped = useMemo(
    () => (params.issue ? scopeToGuestIssue(guests, params.issue) : guests),
    [guests, params.issue],
  );

  const rows = useMemo(() => {
    if (selectionOnly) return guests.filter((guest) => selected.has(guest.id));
    return filterAndSortGuests(scoped, {
      searchTerm: params.q,
      groupIds: params.groups,
      statuses: params.status ? [params.status] : [],
      sides: params.side ? [params.side] : [],
      noPhoneOnly: params.noPhone,
      sortKey: params.sort,
    });
  }, [selectionOnly, guests, selected, scoped, params]);

  const visibleIds = useMemo(() => rows.map((guest) => guest.id), [rows]);

  const statusCounts = useMemo(() => {
    const counts = {
      all: guests.length,
      confirmed: 0,
      pending: 0,
      declined: 0,
    };
    for (const guest of guests) counts[guest.rsvpStatus]++;
    return counts;
  }, [guests]);

  const tableNumberById = useMemo(
    () => new Map(tables.map((table) => [table.id, table.tableNumber])),
    [tables],
  );
  const messagedIds = useMemo(
    () => new Set(messagedGuestIds),
    [messagedGuestIds],
  );
  const byId = useMemo(
    () => new Map(allGuests.map((guest) => [guest.id, guest])),
    [allGuests],
  );

  const countRef = useRef<HTMLParagraphElement>(null);
  // Only there while the list has rows; gone, it counts as zero.
  usePublishedHeight(
    countRef,
    '--guest-count-h',
    allGuests.length > 0 && rows.length > 0,
  );

  // Escape clears the selection, unless a dialog or menu has claimed it.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.key !== 'Escape' ||
        event.defaultPrevented ||
        selected.size === 0
      )
        return;
      if (
        document.querySelector(
          '[role="dialog"],[role="menu"],[role="alertdialog"]',
        )
      )
        return;
      setSelected(new Set());
      setSelectionOnly(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected.size]);

  const clearSelection = () => {
    setSelected(new Set());
    setSelectionOnly(false);
    anchorRef.current = null;
  };

  const handleToggle = (id: string, shiftKey: boolean) => {
    const anchor = anchorRef.current;
    setSelected((prev) =>
      shiftKey && anchor
        ? selectRange(prev, visibleIds, anchor, id, !prev.has(id))
        : toggleOne(prev, id),
    );
    anchorRef.current = id;
  };

  const handleFilterChange: typeof update = (patch, mode) => {
    setSelectionOnly(false);
    update(patch, mode);
  };

  const resetFilters = () => {
    setSelectionOnly(false);
    reset();
  };

  // --- writes -------------------------------------------------------------

  const runWrite = (
    promise: Promise<BulkGuestsState>,
    success: (count: number) => string,
  ) => {
    const checked = promise.then((result) => {
      if (!result.success) throw new Error(t('list.toast.failed'));
      return result;
    });
    toast.promise(checked, {
      loading: t('list.toast.updating'),
      success: (result) =>
        result.count > 0
          ? success(result.count)
          : t('list.toast.nothingChanged'),
      error: (err) =>
        err instanceof Error ? err.message : t('list.toast.failed'),
    });
  };

  const setRsvp = (ids: string[], status: RsvpStatus) => {
    const targets = ids
      .map((id) => byId.get(id))
      .filter((guest): guest is GuestWithGroupApp => !!guest);
    const impact = rsvpImpact(targets, status);
    const run = () =>
      runWrite(setGuestsRsvpStatus(eventId, ids, status), (count) =>
        t(`list.toast.rsvp.${status}`, { count }),
      );
    if (impact.needsConfirm)
      setConfirm({ kind: 'rsvp', status, impact, onConfirm: run });
    else run();
  };

  const setGroup = (
    ids: string[],
    groupId: string | null,
    knownName?: string,
  ) => {
    const name =
      knownName ?? groups.find((group) => group.id === groupId)?.name ?? '';
    runWrite(assignGuestsToGroup(eventId, ids, groupId), (count) =>
      groupId
        ? t('list.toast.group', { count, group: name })
        : t('list.toast.ungrouped', { count }),
    );
  };

  const requestDelete = (ids: string[], singleName?: string) => {
    const targets = ids
      .map((id) => byId.get(id))
      .filter((guest): guest is GuestWithGroupApp => !!guest);
    setConfirm({
      kind: 'delete',
      impact: deleteImpact(targets, messagedIds, guests.length),
      singleName,
      onConfirm: () => {
        if (drawer.open && drawer.guest && ids.includes(drawer.guest.id))
          drawer.onOpenChange(false);
        setSelected((prev) => {
          const next = new Set(prev);
          for (const id of ids) next.delete(id);
          return next;
        });
        setSelectionOnly(false);
        deferred.start(ids);
      },
    });
  };

  const exportGuests = (list: GuestWithGroupApp[], scope: IplanScope) => {
    const fileName = eventName ? `${eventName}-iplan.xls` : 'iplan-guests.xls';
    toast.promise(exportGuestsToIplan(list, { scope, fileName, tables }), {
      loading: t('directory.exportingIplan'),
      success: () => t('directory.exportIplanSuccess'),
      error: (err) =>
        err instanceof Error ? err.message : t('directory.exportFailed'),
    });
  };

  const handleBulk = (action: BulkAction) => {
    const ids = [...selected];
    switch (action.type) {
      case 'rsvp':
        return setRsvp(ids, action.status);
      case 'group':
        return setGroup(ids, action.groupId);
      case 'newGroup':
        return setNewGroupFor(ids);
      case 'side':
        return runWrite(
          setGuestsSideValue(eventId, ids, action.side),
          (count) => t('list.toast.side', { count }),
        );
      case 'export':
        return exportGuests(
          allGuests.filter((guest) => selected.has(guest.id)),
          'all',
        );
      case 'delete':
        return requestDelete(ids);
    }
  };

  const handleRowAction = (guest: GuestWithGroupApp, action: RowAction) => {
    switch (action.type) {
      case 'rsvp':
        return setRsvp([guest.id], action.status);
      case 'group':
        return setGroup([guest.id], action.groupId);
      case 'open':
        return onOpenGuest(guest);
      case 'delete':
        return requestDelete([guest.id], guest.name);
    }
  };

  const drawerNode = (
    <GuestDrawer
      open={drawer.open}
      guest={drawer.guest}
      eventId={eventId}
      groups={groups}
      tables={tables}
      showDietary={showDietary}
      onOpenChange={drawer.onOpenChange}
      onSaved={(guestId) => {
        drawer.onOpenChange(false);
        if (guestId) {
          setRecentlyUpdatedId(guestId);
          setTimeout(() => setRecentlyUpdatedId(null), 3400);
        }
      }}
      onDelete={(guest) => requestDelete([guest.id], guest.name)}
    />
  );

  const importDialog = (
    <ImportGuestsDialog
      open={importOpen}
      onOpenChange={setImportOpen}
      eventId={eventId}
      existingPhones={existingPhones}
    />
  );

  // First use: no toolbar, no meter, no selection - just the way in.
  if (allGuests.length === 0) {
    return (
      <>
        {/* Fills what is left of the page below the tabs, per the design. */}
        <div className="flex min-h-[max(520px,calc(100svh-14rem))] items-center justify-center p-10">
          <div className="flex max-w-[520px] flex-col items-center gap-3.5 text-center">
            <span className="bg-primary/10 text-primary flex size-16 items-center justify-center rounded-[20px]">
              <IconUsers size={30} stroke={1.8} />
            </span>
            <h2 className="text-2xl leading-tight font-extrabold">
              {t('list.empty.title')}
            </h2>
            <p className="text-muted-foreground text-[14.5px] leading-relaxed text-pretty">
              {t('list.empty.body')}
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2.5">
              <Button
                onClick={() => setImportOpen(true)}
                className="h-[42px] gap-2 rounded-[10px] px-[18px] text-[14.5px] font-bold"
              >
                <IconUpload size={18} />
                {t('list.empty.upload')}
              </Button>
              <Button
                variant="outline"
                onClick={onAddGuest}
                className="h-[42px] gap-2 rounded-[10px] px-4 text-[14.5px] font-semibold"
              >
                <IconUserPlus size={18} />
                {t('list.empty.add')}
              </Button>
              <Button
                variant="outline"
                onClick={onImportDrive}
                className="h-[42px] gap-2 rounded-[10px] px-4 text-[14.5px] font-semibold"
              >
                <IconBrandGoogleDrive size={18} />
                {t('list.empty.drive')}
              </Button>
            </div>
          </div>
        </div>
        {drawerNode}
        {importDialog}
      </>
    );
  }

  const hidden = hiddenCount(selected, visibleIds);
  const filtered =
    selectionOnly ||
    rows.length !== guests.length ||
    !!params.q ||
    !!params.status ||
    params.groups.length > 0 ||
    !!params.side ||
    params.noPhone ||
    !!params.issue;

  return (
    <div className="@container/guests flex flex-col">
      <RsvpMeter guests={guests} />
      <GuestToolbar
        params={params}
        onChange={handleFilterChange}
        statusCounts={statusCounts}
        groups={groups}
        onAddGuest={onAddGuest}
        onImportFile={() => setImportOpen(true)}
        onImportDrive={onImportDrive}
        onExport={(scope) => exportGuests(allGuests, scope)}
      />
      <ActiveFilterChips
        params={params}
        groups={groups}
        issueCount={scoped.length}
        onChange={handleFilterChange}
        onClearAll={resetFilters}
      />
      {selectionOnly && (
        <div className="pb-2.5">
          <button
            type="button"
            onClick={() => setSelectionOnly(false)}
            className="bg-primary/8 text-primary border-primary/40 flex h-7 items-center gap-1.5 rounded-full border border-dashed ps-2.5 pe-2 text-[12.5px] font-semibold"
          >
            {t('list.bar.selected', { count: selected.size })}
            <IconX size={13} stroke={2.4} />
          </button>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="border-input my-1 flex min-h-[max(360px,calc(100svh-24rem))] items-center justify-center rounded-[14px] border border-dashed">
          <div className="flex max-w-[380px] flex-col items-center gap-2.5 text-center">
            <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-[14px]">
              <IconSearch size={22} />
            </span>
            <span className="text-[17px] font-bold">
              {t('list.noMatch.title')}
            </span>
            <span className="text-muted-foreground text-[13.5px] leading-normal">
              {t('list.noMatch.body')}
            </span>
            <Button
              variant="outline"
              onClick={resetFilters}
              className="mt-1 h-9 rounded-[10px] px-3.5 font-semibold"
            >
              {t('list.noMatch.clear')}
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Pinned under the toolbar, which casts its shadow over it (D13). */}
          <p
            ref={countRef}
            className="bg-card text-muted-foreground sticky top-[calc(var(--page-header-h,0px)+var(--guest-tabs-h,0px)+var(--guest-toolbar-h,60px))] z-[15] -mx-6 px-6 pt-1.5 pb-2 text-[12.5px]"
          >
            {filtered
              ? t('list.countFiltered', {
                  shown: rows.length.toLocaleString(),
                  total: guests.length.toLocaleString(),
                })
              : t('list.count', { total: guests.length })}
          </p>
          <GuestTable
            rows={rows}
            groups={groups}
            selected={selected}
            headerState={headerState(selected, visibleIds)}
            showMeals={showDietary}
            tableNumberById={tableNumberById}
            recentlyUpdatedId={recentlyUpdatedId}
            onToggleAll={() =>
              setSelected((prev) => toggleAllVisible(prev, visibleIds))
            }
            onToggle={handleToggle}
            onOpen={onOpenGuest}
            onRowAction={handleRowAction}
          />
        </>
      )}

      {/* Fixed to the viewport, not the list: a short list must not carry the bar
          up with it. The empty `justify-center` row is only there so the fixed
          child keeps its static, centred position within the page column
          (the sidebar takes a share of the width) instead of the window's. */}
      <div className="pointer-events-none flex justify-center">
        <div className="pointer-events-none fixed bottom-6 z-30 flex flex-col items-center gap-3">
          <UndoToast
            pending={deferred.pending}
            failedCount={deferred.failure?.returned ?? 0}
            onUndo={deferred.undo}
            onRetry={deferred.retry}
            onDismissFailure={deferred.dismissFailure}
          />
          {selected.size > 0 && (
            <BulkActionBar
              count={selected.size}
              hidden={hidden}
              groups={groups}
              onClear={clearSelection}
              onShowHidden={() => setSelectionOnly(true)}
              onAction={handleBulk}
            />
          )}
        </div>
      </div>

      <GuestConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
      <NewGroupDialog
        ids={newGroupFor}
        eventId={eventId}
        onClose={() => setNewGroupFor(null)}
        onCreated={(groupId, name, ids) => setGroup(ids, groupId, name)}
      />
      {drawerNode}
      {importDialog}
    </div>
  );
}
