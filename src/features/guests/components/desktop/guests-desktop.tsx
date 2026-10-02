'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePublishedHeight } from '@/hooks/use-published-height';
import { useTranslations } from 'next-intl';
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
import { useGuestListView } from '@/features/guests/hooks/use-guest-list-view';
import { useGuestWrites } from '@/features/guests/hooks/use-guest-writes';
import {
  headerState,
  hiddenCount,
  selectRange,
  toggleAllVisible,
  toggleOne,
} from '@/features/guests/utils/guest-selection';
import { ImportGuestsDialog } from '../groups';
import { RsvpMeter } from './rsvp-meter';
import { GuestToolbar } from './guest-toolbar';
import { ActiveFilterChips } from '../active-filter-chips';
import { GuestTable } from './guest-table';
import { BulkActionBar, type BulkAction } from './bulk-action-bar';
import { GuestConfirmDialog } from './guest-confirm-dialog';
import { UndoToast } from '../undo-toast';
import { NewGroupDialog } from './new-group-dialog';
import { GuestDrawer } from '../guest-drawer';
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
  const {
    params,
    changeFilters: handleFilterChange,
    resetFilters,
    deferred,
    startDelete,
    guests,
    scoped,
    rows,
    visibleIds,
    statusCounts,
    filtered,
    selected,
    setSelected,
    selectionOnly,
    setSelectionOnly,
  } = useGuestListView(allGuests, eventId);
  const anchorRef = useRef<string | null>(null);
  const [newGroupFor, setNewGroupFor] = useState<string[] | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [recentlyUpdatedId, setRecentlyUpdatedId] = useState<string | null>(
    null,
  );

  const tableNumberById = useMemo(
    () => new Map(tables.map((table) => [table.id, table.tableNumber])),
    [tables],
  );
  const writes = useGuestWrites({
    eventId,
    eventName,
    allGuests,
    liveCount: guests.length,
    groups,
    tables,
    messagedGuestIds,
  });

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
  }, [selected.size, setSelected, setSelectionOnly]);

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

  // --- writes -------------------------------------------------------------

  const requestDelete = (ids: string[], singleName?: string) =>
    writes.requestDelete(
      ids,
      () => {
        if (drawer.open && drawer.guest && ids.includes(drawer.guest.id))
          drawer.onOpenChange(false);
        startDelete(ids);
      },
      singleName,
    );

  const handleBulk = (action: BulkAction) => {
    const ids = [...selected];
    switch (action.type) {
      case 'rsvp':
        return writes.setRsvp(ids, action.status);
      case 'group':
        return writes.setGroup(ids, action.groupId);
      case 'newGroup':
        return setNewGroupFor(ids);
      case 'side':
        return writes.setSide(ids, action.side);
      case 'export':
        return writes.exportGuests(
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
        return writes.setRsvp([guest.id], action.status);
      case 'group':
        return writes.setGroup([guest.id], action.groupId);
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
              <Button onClick={() => setImportOpen(true)}>
                <IconUpload size={18} />
                {t('list.empty.upload')}
              </Button>
              <Button variant="outline" onClick={onAddGuest}>
                <IconUserPlus size={18} />
                {t('list.empty.add')}
              </Button>
              <Button variant="outline" onClick={onImportDrive}>
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
        onExport={(scope) => writes.exportGuests(allGuests, scope)}
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
            className="bg-app-shell text-muted-foreground sticky top-[calc(var(--page-header-h,0px)+var(--guest-tabs-h,0px)+var(--guest-toolbar-h,60px))] z-[15] -mx-6 px-6 pt-1.5 pb-2 text-[12.5px]"
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

      <GuestConfirmDialog
        request={writes.confirm}
        onClose={writes.closeConfirm}
      />
      <NewGroupDialog
        ids={newGroupFor}
        eventId={eventId}
        onClose={() => setNewGroupFor(null)}
        onCreated={(groupId, name, ids) => writes.setGroup(ids, groupId, name)}
      />
      {drawerNode}
      {importDialog}
    </div>
  );
}
