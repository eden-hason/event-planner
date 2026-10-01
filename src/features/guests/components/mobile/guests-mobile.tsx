'use client';

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslations } from 'next-intl';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import {
  IconBrandGoogleDrive,
  IconDots,
  IconFilter2,
  IconListCheck,
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
import { rsvpPresentation, RSVP_STATUSES } from '@/features/guests/utils';
import {
  activeFilterCount,
  GUEST_STATUS_FILTERS,
  type GuestListParams,
} from '@/features/guests/utils/guest-list-params';
import {
  headcountShare,
  rsvpHeadcounts,
} from '@/features/guests/utils/rsvp-headcounts';
import {
  hiddenCount,
  toggleAllVisible,
  toggleOne,
} from '@/features/guests/utils/guest-selection';
import { useGuestListView } from '@/features/guests/hooks/use-guest-list-view';
import { useGuestWrites } from '@/features/guests/hooks/use-guest-writes';
import { useHideBottomNav } from '@/components/layout/bottom-nav-context';
import { cn } from '@/lib/utils';
import { ActiveFilterChips } from '../active-filter-chips';
import { GuestDrawer } from '../guest-drawer';
import { UndoToast } from '../undo-toast';
import { CARD_HEIGHT, GuestMobileCard } from './guest-mobile-card';
import { GuestFiltersSheet } from './guest-filters-sheet';
import { SelectionBar, type SelectionAction } from './selection-bar';
import {
  ExportSheet,
  GroupSheet,
  GuestConfirmSheet,
  GuestRowSheet,
  MoreSheet,
  RsvpSheet,
  SideSheet,
} from './guest-action-sheets';

const CARD_GAP = 7;

/** What the page header shows while selecting - it becomes the selection's. */
export type SelectionHeader = {
  count: number;
  hidden: number;
  onClear: () => void;
  onSelectAll: () => void;
  onShowHidden: () => void;
};

type OpenSheet =
  | { kind: 'filters' }
  | { kind: 'more' }
  | { kind: 'row'; guest: GuestWithGroupApp }
  | { kind: 'rowGroup'; guest: GuestWithGroupApp }
  | { kind: SelectionAction }
  | null;

interface GuestsMobileProps {
  guests: GuestWithGroupApp[];
  groups: GroupWithGuestsApp[];
  eventId: string;
  eventName?: string;
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
  onImportFile: () => void;
  onImportDrive: () => void;
  onSelectionHeader: (header: SelectionHeader | null) => void;
}

/**
 * The phone's Guests tab (Guests Mobile design): the same list, filters and
 * order as desktop, as 72px cards. A long press or "Select" starts a
 * selection - the page header turns into its count and an action bar takes
 * the bottom nav's place.
 */
export function GuestsMobile({
  guests: allGuests,
  groups,
  eventId,
  eventName,
  messagedGuestIds,
  showDietary,
  tables,
  drawer,
  onOpenGuest,
  onAddGuest,
  onImportFile,
  onImportDrive,
  onSelectionHeader,
}: GuestsMobileProps) {
  const t = useTranslations('guests');
  const {
    params,
    changeFilters,
    resetFilters,
    deferred,
    startDelete,
    guests,
    scoped,
    rows,
    visibleIds,
    statusCounts,
    filtered,
    countFor,
    selected,
    setSelected,
    selectionOnly,
    setSelectionOnly,
  } = useGuestListView(allGuests, eventId);

  const [selecting, setSelecting] = useState(false);
  const [sheet, setSheet] = useState<OpenSheet>(null);
  const closeSheet = () => setSheet(null);

  useHideBottomNav(selecting);

  const writes = useGuestWrites({
    eventId,
    eventName,
    allGuests,
    liveCount: guests.length,
    groups,
    tables,
    messagedGuestIds,
  });

  const exitSelection = () => {
    setSelecting(false);
    setSelected(new Set());
    setSelectionOnly(false);
  };

  const hidden = hiddenCount(selected, visibleIds);

  // The page header turns into the selection's while it lasts. Its callbacks
  // read the latest list through a ref, so the header only updates when what
  // it shows changes - not on every keystroke or tap.
  const latest = useRef({ visibleIds, exitSelection });
  latest.current = { visibleIds, exitSelection };
  useEffect(() => {
    onSelectionHeader(
      selecting
        ? {
            count: selected.size,
            hidden,
            onClear: () => latest.current.exitSelection(),
            onSelectAll: () =>
              setSelected((prev) =>
                toggleAllVisible(prev, latest.current.visibleIds),
              ),
            onShowHidden: () => setSelectionOnly(true),
          }
        : null,
    );
  }, [selecting, selected.size, hidden, onSelectionHeader, setSelected, setSelectionOnly]);
  useEffect(() => () => onSelectionHeader(null), [onSelectionHeader]);

  // --- the virtualized list -----------------------------------------------

  const bodyRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  // Where the cards start in the document; it moves when the meter or a chip
  // row above it comes or goes. The threshold keeps it from re-triggering.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const top = bodyRef.current
      ? bodyRef.current.getBoundingClientRect().top + window.scrollY
      : 0;
    if (Math.abs(top - scrollMargin) > 0.5) setScrollMargin(top);
  });
  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => CARD_HEIGHT + CARD_GAP,
    overscan: 8,
    scrollMargin,
  });

  // --- actions --------------------------------------------------------------

  const deleteIds = (ids: string[], singleName?: string) =>
    writes.requestDelete(
      ids,
      () => {
        if (drawer.open && drawer.guest && ids.includes(drawer.guest.id))
          drawer.onOpenChange(false);
        // A bulk delete empties the selection; the Undo toast takes over.
        if (!singleName) exitSelection();
        startDelete(ids);
      },
      singleName,
    );

  const selectedIds = () => [...selected];
  const rowGuest = sheet?.kind === 'rowGroup' ? sheet.guest : null;

  const drawerNode = (
    <GuestDrawer
      variant="mobile"
      open={drawer.open}
      guest={drawer.guest}
      eventId={eventId}
      groups={groups}
      tables={tables}
      showDietary={showDietary}
      onOpenChange={drawer.onOpenChange}
      onSaved={() => drawer.onOpenChange(false)}
      onDelete={(guest) => deleteIds([guest.id], guest.name)}
    />
  );

  // First use: no toolbar, no meter, no selection - just the way in.
  if (allGuests.length === 0) {
    return (
      <>
        <div className="flex min-h-[calc(100svh-15rem)] flex-col items-center justify-center gap-3 px-2 py-7 text-center">
          <span className="bg-primary/10 text-primary flex size-[60px] items-center justify-center rounded-[18px]">
            <IconUsers size={28} stroke={1.8} />
          </span>
          <h2 className="text-[21px] leading-tight font-extrabold">
            {t('list.empty.title')}
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed text-pretty">
            {t('list.empty.body')}
          </p>
          <div className="mt-2.5 flex w-full flex-col gap-[9px]">
            <Button
              onClick={onImportFile}
              className="h-12 gap-2 rounded-xl text-[15px] font-bold"
            >
              <IconUpload size={18} />
              {t('list.empty.upload')}
            </Button>
            <Button
              variant="outline"
              onClick={onAddGuest}
              className="h-12 gap-2 rounded-xl text-[15px] font-semibold"
            >
              <IconUserPlus size={18} />
              {t('list.empty.add')}
            </Button>
            <Button
              variant="outline"
              onClick={onImportDrive}
              className="h-12 gap-2 rounded-xl text-[15px] font-semibold"
            >
              <IconBrandGoogleDrive size={18} />
              {t('list.importDrive')}
            </Button>
          </div>
        </div>
        {drawerNode}
      </>
    );
  }

  const filterCount = activeFilterCount(params);
  const hasChipRow = filterCount > 0 || !!params.issue || selectionOnly;

  return (
    <div className={cn('flex flex-col', selecting && 'pb-24')}>
      {!selecting && !hasChipRow && <Meter guests={guests} />}

      <Toolbar
        params={params}
        filterCount={filterCount}
        selecting={selecting}
        onSearch={(q) => changeFilters({ q }, 'replace')}
        onFilters={() => setSheet({ kind: 'filters' })}
        onMore={() => setSheet({ kind: 'more' })}
        onSelect={() => setSelecting(true)}
      />

      {/* All four share the width rather than scrolling past the page's edge. */}
      <div className="flex gap-1.5 pt-2.5">
        {GUEST_STATUS_FILTERS.map((status) => {
          const on = params.status === status;
          return (
            <button
              key={status ?? 'all'}
              type="button"
              aria-pressed={on}
              onClick={() => changeFilters({ status })}
              className={cn(
                'flex h-8 min-w-0 flex-auto items-center justify-center gap-1 rounded-full border px-2 text-[13px] whitespace-nowrap',
                on
                  ? 'border-primary bg-primary/10 text-primary font-bold'
                  : 'bg-card text-muted-foreground font-medium',
              )}
            >
              {status && (
                <span
                  className={cn(
                    'size-1.5 rounded-full',
                    rsvpPresentation(status).solid,
                  )}
                />
              )}
              {t(`list.status.${status ?? 'all'}`)}
              <span className="font-bold tabular-nums">
                {statusCounts[status ?? 'all'].toLocaleString()}
              </span>
            </button>
          );
        })}
      </div>

      <ActiveFilterChips
        params={params}
        groups={groups}
        issueCount={scoped.length}
        onChange={changeFilters}
        className="gap-1.5 pt-2 pb-0"
        leading={
          selectionOnly && (
            <button
              type="button"
              onClick={() => setSelectionOnly(false)}
              className="bg-primary/8 text-primary border-primary/40 flex h-7 items-center gap-1.5 rounded-full border border-dashed ps-2.5 pe-2 text-[12.5px] font-semibold"
            >
              {t('list.bar.selected', { count: selected.size })}
              <IconX size={13} stroke={2.4} />
            </button>
          )
        }
      />

      {rows.length === 0 ? (
        <div className="flex min-h-[calc(100svh-22rem)] flex-col items-center justify-center gap-2.5 px-3 py-10 text-center">
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
            className="mt-1 h-[42px] rounded-[11px] px-[18px] font-semibold"
          >
            {t('list.noMatch.clear')}
          </Button>
        </div>
      ) : (
        <>
          <p className="text-muted-foreground px-0.5 pt-2.5 pb-1.5 text-[12.5px]">
            {filtered
              ? t('list.countFiltered', {
                  shown: rows.length.toLocaleString(),
                  total: guests.length.toLocaleString(),
                })
              : t('list.count', { total: guests.length })}
          </p>
          <div
            ref={bodyRef}
            className="relative"
            style={{ height: virtualizer.getTotalSize() }}
          >
            {virtualizer.getVirtualItems().map((item) => {
              const guest = rows[item.index];
              return (
                <GuestMobileCard
                  key={guest.id}
                  guest={guest}
                  selecting={selecting}
                  checked={selected.has(guest.id)}
                  style={{
                    position: 'absolute',
                    insetInline: 0,
                    top: 0,
                    transform: `translateY(${item.start - virtualizer.options.scrollMargin}px)`,
                  }}
                  onOpen={() => onOpenGuest(guest)}
                  onToggle={() =>
                    setSelected((prev) => toggleOne(prev, guest.id))
                  }
                  onLongPress={() => {
                    setSelecting(true);
                    setSelected((prev) => new Set(prev).add(guest.id));
                  }}
                  onMenu={() => setSheet({ kind: 'row', guest })}
                />
              );
            })}
          </div>
        </>
      )}

      <UndoToast
        pending={deferred.pending}
        failedCount={deferred.failure?.returned ?? 0}
        onUndo={deferred.undo}
        onRetry={deferred.retry}
        onDismissFailure={deferred.dismissFailure}
        className="fixed inset-x-3 bottom-[calc(var(--app-bottom-nav-height)+env(safe-area-inset-bottom)+12px)] z-40 rounded-[14px]"
      />

      {selecting && (
        <SelectionBar
          disabled={selected.size === 0}
          // Only the bar's own sheets share its action names.
          active={
            writes.confirm?.kind === 'delete'
              ? 'delete'
              : ((sheet?.kind as SelectionAction | undefined) ?? null)
          }
          onAction={(action) => {
            if (action === 'delete') deleteIds(selectedIds());
            else setSheet({ kind: action });
          }}
        />
      )}

      <GuestFiltersSheet
        open={sheet?.kind === 'filters'}
        onClose={closeSheet}
        params={params}
        groups={groups}
        countFor={countFor}
        onApply={(patch) => changeFilters(patch)}
      />
      <MoreSheet
        open={sheet?.kind === 'more'}
        onClose={closeSheet}
        onImportFile={onImportFile}
        onImportDrive={onImportDrive}
        onExport={(scope) => writes.exportGuests(allGuests, scope)}
      />
      <GuestRowSheet
        guest={sheet?.kind === 'row' ? sheet.guest : null}
        onClose={closeSheet}
        onRsvp={(guest, status) => {
          closeSheet();
          writes.setRsvp([guest.id], status);
        }}
        onPickGroup={(guest) => setSheet({ kind: 'rowGroup', guest })}
        onOpen={(guest) => {
          closeSheet();
          onOpenGuest(guest);
        }}
        onDelete={(guest) => {
          closeSheet();
          deleteIds([guest.id], guest.name);
        }}
      />
      {/* One record's group from its menu, or the selection's from the bar. */}
      <GroupSheet
        open={sheet?.kind === 'rowGroup' || sheet?.kind === 'group'}
        title={
          rowGuest
            ? t('list.rowMenu.moveToGroup')
            : t('list.mobile.groupTitle', { count: selected.size })
        }
        subtitle={rowGuest?.name}
        eventId={eventId}
        groups={groups}
        currentGroupId={rowGuest?.groupId}
        canRemove={rowGuest ? !!rowGuest.groupId : true}
        onClose={closeSheet}
        onPick={(groupId, name) =>
          writes.setGroup(rowGuest ? [rowGuest.id] : selectedIds(), groupId, name)
        }
      />
      <RsvpSheet
        open={sheet?.kind === 'rsvp'}
        count={selected.size}
        onClose={closeSheet}
        onPick={(status) => {
          closeSheet();
          writes.setRsvp(selectedIds(), status);
        }}
      />
      <SideSheet
        open={sheet?.kind === 'side'}
        count={selected.size}
        onClose={closeSheet}
        onPick={(side) => {
          closeSheet();
          writes.setSide(selectedIds(), side);
        }}
      />
      <ExportSheet
        open={sheet?.kind === 'export'}
        count={selected.size}
        hidden={hidden}
        onClose={closeSheet}
        onDownload={() => {
          closeSheet();
          writes.exportGuests(
            allGuests.filter((guest) => selected.has(guest.id)),
            'all',
          );
        }}
      />
      <GuestConfirmSheet
        request={writes.confirm}
        onClose={writes.closeConfirm}
      />
      {drawerNode}
    </div>
  );
}


/**
 * The RSVP meter at the top of the list. Counts are Guests (the sum of
 * amounts); the list below counts records. Information only - filtering is
 * the status chips' job.
 */
function Meter({ guests }: { guests: GuestWithGroupApp[] }) {
  const t = useTranslations('guests.list');
  const counts = useMemo(() => rsvpHeadcounts(guests), [guests]);

  return (
    <div className="bg-card flex flex-col gap-2 rounded-[14px] border px-3.5 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex items-baseline gap-[5px]">
          <b className="text-xl font-extrabold tabular-nums">
            {Math.round(headcountShare(counts, 'confirmed'))}%
          </b>
          <span className="text-muted-foreground text-[12.5px]">
            {t('meter.confirmed')}
          </span>
        </span>
        <span className="text-muted-foreground truncate text-xs">
          {t('meter.line', {
            guests: counts.total.toLocaleString(),
            records: guests.length.toLocaleString(),
          })}
        </span>
      </div>
      <div className="bg-muted flex h-[7px] gap-0.5 overflow-hidden rounded-full">
        {RSVP_STATUSES.map((status) => (
          <div
            key={status}
            className={rsvpPresentation(status).solid}
            style={{ width: `${headcountShare(counts, status)}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function Toolbar({
  params,
  filterCount,
  selecting,
  onSearch,
  onFilters,
  onMore,
  onSelect,
}: {
  params: GuestListParams;
  filterCount: number;
  selecting: boolean;
  onSearch: (q: string) => void;
  onFilters: () => void;
  onMore: () => void;
  onSelect: () => void;
}) {
  const t = useTranslations('guests.list');
  // The input keeps its own value so typing never waits on the URL.
  const [query, setQuery] = useState(params.q);
  useEffect(() => setQuery(params.q), [params.q]);

  return (
    <div className="flex gap-[7px] pt-2.5">
      <label className="border-input bg-card focus-within:border-ring focus-within:ring-ring/50 flex h-10 min-w-0 flex-1 items-center gap-[7px] rounded-[11px] border px-[11px] focus-within:ring-[3px]">
        <IconSearch size={16} className="text-muted-foreground shrink-0" />
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            onSearch(event.target.value);
          }}
          placeholder={t('searchPlaceholder')}
          // 16px keeps iOS from zooming the page into the field.
          className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-base outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            aria-label={t('mobile.clearSearch')}
            onClick={() => {
              setQuery('');
              onSearch('');
            }}
            className="text-muted-foreground -me-1 flex size-7 shrink-0 items-center justify-center"
          >
            <IconX size={15} />
          </button>
        )}
      </label>
      <button
        type="button"
        onClick={onFilters}
        aria-label={t('mobile.filters.title')}
        className={cn(
          'relative flex size-10 shrink-0 items-center justify-center rounded-[11px] border',
          filterCount > 0
            ? 'border-primary bg-primary/8 text-primary'
            : 'border-input bg-card text-muted-foreground',
        )}
      >
        <IconFilter2 size={18} />
        {filterCount > 0 && (
          <span className="bg-primary text-primary-foreground absolute -start-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-[5px] text-[11px] font-bold">
            {filterCount}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={onMore}
        aria-label={t('more')}
        className="border-input bg-card text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-[11px] border"
      >
        <IconDots size={18} stroke={2.4} />
      </button>
      {!selecting && (
        <button
          type="button"
          onClick={onSelect}
          className="border-input bg-card flex h-10 shrink-0 items-center gap-[5px] rounded-[11px] border px-[11px] text-sm font-semibold"
        >
          <IconListCheck size={16} />
          {t('mobile.select')}
        </button>
      )}
    </div>
  );
}
