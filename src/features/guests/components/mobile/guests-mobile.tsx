'use client';

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useTranslations } from 'next-intl';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import {
  IconArrowsSort,
  IconBrandGoogleDrive,
  IconBus,
  IconDownload,
  IconFilter2,
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
  rsvpPresentation,
  RSVP_STATUSES,
  type RsvpStatus,
} from '@/features/guests/utils';
import {
  activeFilterCount,
  GUEST_STATUS_FILTERS,
} from '@/features/guests/utils/guest-list-params';
import {
  headcountShare,
  rsvpHeadcounts,
} from '@/features/guests/utils/rsvp-headcounts';
import { transportationSummary } from '@/features/guests/utils/transportation-summary';
import {
  headerState,
  hiddenCount,
  toggleAllVisible,
  toggleOne,
} from '@/features/guests/utils/guest-selection';
import { useGuestListView } from '@/features/guests/hooks/use-guest-list-view';
import { useGuestWrites } from '@/features/guests/hooks/use-guest-writes';
import { useIplanExportOptions } from '@/features/guests/hooks/use-iplan-export-options';
import { useHideBottomNav } from '@/components/layout/bottom-nav-context';
import { cn } from '@/lib/utils';
import { ActiveFilterChips } from '../active-filter-chips';
import { GuestDrawer, type GuestDrawerTab } from '../guest-drawer';
import { UndoToast } from '../undo-toast';
import { SelectBox } from '../desktop/select-box';
import {
  CARD_HEIGHT,
  checkboxSlotClass,
  GuestMobileCard,
} from './guest-mobile-card';
import { OutsidePackageBanner, PackageLine } from '../package';
import { GuestFiltersSheet } from './guest-filters-sheet';
import { SelectionBar, type SelectionAction } from './selection-bar';
import {
  ExportSheet,
  GroupSheet,
  GuestConfirmSheet,
  ImportSheet,
  IplanExportSheet,
  RsvpSheet,
  SideSheet,
  SortSheet,
} from './guest-action-sheets';

type OpenSheet =
  | { kind: 'filters' }
  | { kind: 'sort' }
  | { kind: 'import' }
  | { kind: 'iplan' }
  | { kind: SelectionAction }
  | null;

interface GuestsMobileProps {
  guests: GuestWithGroupApp[];
  groups: GroupWithGuestsApp[];
  eventId: string;
  eventName?: string;
  /** Guest Records a Delivery has reached - named in the delete confirm. */
  messagedGuestIds: string[];
  /** Records that missed the latest Invitation or Confirmation that went out (ADR 0050) */
  missedCatchUpIds: string[];
  /** Records that changed their own answer, for the `?changed=1` filter */
  changedAnswerIds: string[];
  showDietary: boolean;
  showTransportation: boolean;
  tables: TableOption[];
  drawer: {
    open: boolean;
    guest: GuestWithGroupApp | null;
    tab: GuestDrawerTab;
    onTabChange: (tab: GuestDrawerTab) => void;
    onOpenChange: (open: boolean) => void;
  };
  onOpenGuest: (guest: GuestWithGroupApp) => void;
  onAddGuest: () => void;
  onImportFile: () => void;
  onImportDrive: () => void;
  onImportWhatsApp: () => void;
}

/**
 * The phone's Guests tab (Guests table controls design): the same list,
 * filters and order as desktop. The RSVP overview doubles as the status
 * filter; the list is one card of rows. "Select" in its header slides a
 * checkbox into every row and brings up the action bar in the bottom nav's
 * place; "Cancel" puts both away.
 */
export function GuestsMobile({
  guests: allGuests,
  groups,
  eventId,
  eventName,
  messagedGuestIds,
  missedCatchUpIds,
  changedAnswerIds,
  showDietary,
  showTransportation,
  tables,
  drawer,
  onOpenGuest,
  onAddGuest,
  onImportFile,
  onImportDrive,
  onImportWhatsApp,
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
    outsideIds,
    outsideCount,
    outsideOnly,
    missedCount,
    changedCount,
    filtered,
    countFor,
    selected,
    setSelected,
    selectionOnly,
    setSelectionOnly,
  } = useGuestListView(allGuests, eventId, missedCatchUpIds, changedAnswerIds);

  const [sheet, setSheet] = useState<OpenSheet>(null);
  const closeSheet = () => setSheet(null);

  // "Select" turns the rows into checkboxes; the action bar takes the bottom
  // nav's place until "Cancel".
  const [selecting, setSelecting] = useState(false);
  const anySelected = selected.size > 0;
  useHideBottomNav(selecting);

  const counts = useMemo(() => rsvpHeadcounts(guests), [guests]);
  const exportOptions = useIplanExportOptions(counts, statusCounts);
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

  const exitSelection = () => {
    setSelecting(false);
    setSelected(new Set());
    setSelectionOnly(false);
  };

  const hidden = hiddenCount(selected, visibleIds);

  // --- the virtualized list -----------------------------------------------

  const bodyRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  // Where the rows start in the document; it moves when a chip row or banner
  // above it comes or goes. The threshold keeps it from re-triggering.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const top = bodyRef.current
      ? bodyRef.current.getBoundingClientRect().top + window.scrollY
      : 0;
    if (Math.abs(top - scrollMargin) > 0.5) setScrollMargin(top);
  });
  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => CARD_HEIGHT,
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

  const drawerNode = (
    <GuestDrawer
      variant="mobile"
      open={drawer.open}
      guest={drawer.guest}
      tab={drawer.tab}
      onTabChange={drawer.onTabChange}
      eventId={eventId}
      groups={groups}
      tables={tables}
      showDietary={showDietary}
      showTransportation={showTransportation}
      onOpenChange={drawer.onOpenChange}
      onSaved={() => drawer.onOpenChange(false)}
      onDelete={(guest) => deleteIds([guest.id], guest.name)}
    />
  );

  // First use: no overview, no list - just the way in.
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
            <Button onClick={onImportFile}>
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
        {drawerNode}
      </>
    );
  }

  const filterCount = activeFilterCount(params);
  const summary = anySelected
    ? t('list.mobile.selectedSummary', {
        count: selected.size,
        guests: rsvpHeadcounts(
          allGuests.filter((guest) => selected.has(guest.id)),
        ).total,
      })
    : outsideOnly && rows.length === outsideCount
      ? t('package.countOutside', { count: outsideCount })
      : filtered
        ? t('list.countFiltered', {
            shown: rows.length.toLocaleString(),
            total: guests.length.toLocaleString(),
          })
        : t('list.countSummary', {
            records: guests.length,
            guests: counts.total,
          });

  return (
    <div className={cn('flex flex-col gap-3', selecting && 'pb-24')}>
      <Overview
        guests={guests}
        statusCounts={statusCounts}
        status={outsideOnly ? undefined : params.status}
        showTransportation={showTransportation}
        transportOn={params.transport === 'yes'}
        onStatusChange={(status) => changeFilters({ status, outside: false })}
        onTransportToggle={() =>
          changeFilters({
            transport: params.transport === 'yes' ? null : 'yes',
          })
        }
        footer={
          <PackageLine
            onShowOutside={() => changeFilters({ outside: true, status: null })}
          />
        }
      />

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          onClick={() => setSheet({ kind: 'import' })}
          className="h-10 rounded-[10px] font-semibold"
        >
          <IconDownload size={17} />
          {t('list.importMenu.button')}
        </Button>
        <Button
          variant="outline"
          onClick={() => setSheet({ kind: 'iplan' })}
          className="h-10 rounded-[10px] font-semibold"
        >
          <IconUpload size={17} />
          {t('directory.exportIplan')}
        </Button>
      </div>

      <Toolbar
        query={params.q}
        filterCount={filterCount}
        sortLabel={t('list.sortWith', { label: t(`sort.${params.sort}`) })}
        onSearch={(q) => changeFilters({ q }, 'replace')}
        onFilters={() => setSheet({ kind: 'filters' })}
        onSort={() => setSheet({ kind: 'sort' })}
      />

      <ActiveFilterChips
        params={params}
        groups={groups}
        issueCount={scoped.length}
        onChange={changeFilters}
        className="gap-1.5 pb-0"
        leading={
          (selectionOnly || outsideOnly) && (
            <>
              {selectionOnly && (
                <LeadingChip onClick={() => setSelectionOnly(false)}>
                  {t('list.bar.selected', { count: selected.size })}
                </LeadingChip>
              )}
              {outsideOnly && (
                <LeadingChip onClick={() => changeFilters({ outside: false })}>
                  {t('package.chip')}
                </LeadingChip>
              )}
            </>
          )
        }
      />

      {outsideOnly && <OutsidePackageBanner variant="mobile" />}

      <section
        aria-label={t('title')}
        className="bg-card overflow-clip rounded-[14px] border"
      >
        <div
          className={cn(
            'flex min-h-12 items-center justify-between gap-2 pe-2 transition-[padding,background-color] duration-200 motion-reduce:transition-none',
            selecting ? 'ps-1' : 'ps-3.5',
            anySelected ? 'bg-primary/8' : 'bg-muted/40',
          )}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <span inert={!selecting} className={checkboxSlotClass(selecting)}>
              <SelectBox
                state={headerState(selected, visibleIds)}
                label={t('list.columns.selectAll')}
                onClick={() =>
                  setSelected((prev) => toggleAllVisible(prev, visibleIds))
                }
                className="[&>span]:size-5"
              />
            </span>
            <span
              className={cn(
                'min-w-0 truncate text-[13.5px] tabular-nums',
                anySelected
                  ? 'text-primary font-semibold'
                  : 'text-muted-foreground font-medium',
              )}
            >
              {summary}
              {anySelected && hidden > 0 && (
                <>
                  {' · '}
                  <button
                    type="button"
                    onClick={() => setSelectionOnly(true)}
                    className="underline underline-offset-[3px]"
                  >
                    {t('list.bar.hidden', { count: hidden })}
                  </button>
                </>
              )}
            </span>
          </div>
          <Button
            variant="soft"
            onClick={() => (selecting ? exitSelection() : setSelecting(true))}
            className="h-8 shrink-0 rounded-lg px-3 text-[13px] font-semibold"
          >
            {selecting
              ? t('list.mobile.cancelSelection')
              : t('list.mobile.select')}
          </Button>
        </div>

        {rows.length === 0 ? (
          <div className="flex min-h-[calc(100svh-30rem)] flex-col items-center justify-center gap-2.5 border-t px-3 py-10 text-center">
            <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-[14px]">
              <IconSearch size={22} />
            </span>
            <span className="text-[17px] font-bold">
              {t('list.noMatch.title')}
            </span>
            <span className="text-muted-foreground text-[13.5px] leading-normal">
              {t('list.noMatch.body')}
            </span>
            <Button variant="outline" onClick={resetFilters} className="mt-1">
              {t('list.noMatch.clear')}
            </Button>
          </div>
        ) : (
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
                  tableNumber={
                    guest.tableId
                      ? tableNumberById.get(guest.tableId)
                      : undefined
                  }
                  outside={outsideIds.has(guest.id)}
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
                />
              );
            })}
          </div>
        )}
      </section>

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
          disabled={!anySelected}
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
        showTransportation={showTransportation}
        open={sheet?.kind === 'filters'}
        onClose={closeSheet}
        params={params}
        groups={groups}
        missedCount={missedCount}
        changedCount={changedCount}
        countFor={countFor}
        onApply={(patch) => changeFilters(patch)}
      />
      <SortSheet
        open={sheet?.kind === 'sort'}
        onClose={closeSheet}
        sort={params.sort}
        onPick={(sort) => changeFilters({ sort })}
      />
      <ImportSheet
        open={sheet?.kind === 'import'}
        onClose={closeSheet}
        onImportFile={onImportFile}
        onImportDrive={onImportDrive}
        onImportWhatsApp={onImportWhatsApp}
      />
      <IplanExportSheet
        open={sheet?.kind === 'iplan'}
        onClose={closeSheet}
        options={exportOptions}
        onExport={(scope) => writes.exportGuests(allGuests, scope)}
      />
      <GroupSheet
        open={sheet?.kind === 'group'}
        title={t('list.mobile.groupTitle', { count: selected.size })}
        eventId={eventId}
        groups={groups}
        canRemove
        onClose={closeSheet}
        onPick={(groupId, name) =>
          writes.setGroup(selectedIds(), groupId, name)
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
 * The RSVP overview at the top of the list: the share confirmed over the
 * meter, then the status buttons, which double as the status filter. Counts
 * are Guests (the sum of amounts); the list below counts records.
 */
function Overview({
  guests,
  statusCounts,
  status,
  showTransportation,
  transportOn,
  onStatusChange,
  onTransportToggle,
  footer,
}: {
  guests: GuestWithGroupApp[];
  statusCounts: Record<RsvpStatus | 'all', number>;
  /** The status the list is narrowed to; `undefined` while no status button is on. */
  status: RsvpStatus | null | undefined;
  /** The Event asks the transportation question, so its row shows. */
  showTransportation: boolean;
  transportOn: boolean;
  onStatusChange: (status: RsvpStatus | null) => void;
  onTransportToggle: () => void;
  /** The Record Package strip, along the card's bottom. */
  footer: ReactNode;
}) {
  const t = useTranslations('guests.list');
  const counts = useMemo(() => rsvpHeadcounts(guests), [guests]);

  return (
    <div className="bg-card overflow-hidden rounded-[14px] border">
      <div className="flex flex-col gap-3 p-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="flex items-baseline gap-2">
            <b className="text-2xl leading-none font-extrabold tabular-nums">
              {Math.round(headcountShare(counts, 'confirmed'))}%
            </b>
            <span className="text-muted-foreground text-[13px]">
              {t('overview.confirmed')}
            </span>
          </span>
          <span className="text-muted-foreground text-[12.5px] whitespace-nowrap tabular-nums">
            {t('overview.totals', {
              guests: counts.total,
              records: statusCounts.all,
            })}
          </span>
        </div>
        <div
          role="img"
          aria-label={RSVP_STATUSES.map(
            (key) => `${counts[key]} ${t(`status.${key}`)}`,
          ).join(', ')}
          className="bg-muted flex h-1.5 gap-0.5 overflow-hidden rounded-full"
        >
          {RSVP_STATUSES.map((key) => (
            <div
              key={key}
              className={rsvpPresentation(key).solid}
              style={{ width: `${headcountShare(counts, key)}%` }}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <div
            role="radiogroup"
            aria-label={t('overview.label')}
            className="col-span-2 grid grid-cols-2 gap-1.5"
          >
            {GUEST_STATUS_FILTERS.map((key) => (
              <OverviewButton
                key={key ?? 'all'}
                role="radio"
                on={status === key}
                leading={
                  <span
                    className={cn(
                      'size-2 rounded-full',
                      key ? rsvpPresentation(key).solid : 'bg-foreground',
                    )}
                  />
                }
                label={t(`status.${key ?? 'all'}`)}
                value={(key ? counts[key] : counts.total).toLocaleString()}
                onClick={() => onStatusChange(key)}
              />
            ))}
          </div>
          {showTransportation && (
            <OverviewButton
              on={transportOn}
              leading={<IconBus size={15} className="text-primary" />}
              label={t('overview.transport')}
              value={transportationSummary(guests).yes.toLocaleString()}
              detail={t('overview.transportOf', { count: counts.confirmed })}
              onClick={onTransportToggle}
              className="col-span-2"
            />
          )}
        </div>
      </div>
      {footer}
    </div>
  );
}

/**
 * One button in the overview: a status, a radio of the status filter; or the
 * transportation row, a toggle of its own.
 */
function OverviewButton({
  role,
  on,
  leading,
  label,
  value,
  detail,
  onClick,
  className,
}: {
  role?: 'radio';
  on: boolean;
  leading: ReactNode;
  label: string;
  value: string;
  detail?: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={role ? on : undefined}
      aria-pressed={role ? undefined : on}
      onClick={onClick}
      className={cn(
        'flex h-10 items-center justify-between gap-1.5 rounded-[10px] border px-3 transition-colors',
        on ? 'border-primary bg-primary/8' : 'bg-card active:bg-muted/60',
        className,
      )}
    >
      <span
        className={cn(
          'flex min-w-0 items-center gap-1.5 text-[13.5px] font-semibold',
          on ? 'text-primary' : 'text-muted-foreground',
        )}
      >
        <span aria-hidden className="flex shrink-0">
          {leading}
        </span>
        <span className="truncate">{label}</span>
      </span>
      <span className="flex shrink-0 items-baseline gap-1.5">
        <span className="text-foreground text-[15px] font-bold tabular-nums">
          {value}
        </span>
        {detail && (
          <span className="text-muted-foreground text-xs">{detail}</span>
        )}
      </span>
    </button>
  );
}

function Toolbar({
  query: committed,
  filterCount,
  sortLabel,
  onSearch,
  onFilters,
  onSort,
}: {
  query: string;
  filterCount: number;
  sortLabel: string;
  onSearch: (q: string) => void;
  onFilters: () => void;
  onSort: () => void;
}) {
  const t = useTranslations('guests.list');
  // The input keeps its own value so typing never waits on the URL.
  const [query, setQuery] = useState(committed);
  useEffect(() => setQuery(committed), [committed]);

  return (
    <div className="flex gap-[7px]">
      <label className="border-input bg-card focus-within:border-ring focus-within:ring-ring/50 flex h-10 min-w-0 flex-1 items-center gap-[7px] rounded-[10px] border px-[11px] focus-within:ring-[3px]">
        <IconSearch size={16} className="text-muted-foreground shrink-0" />
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            onSearch(event.target.value);
          }}
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchPlaceholder')}
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
      <Button
        variant={filterCount > 0 ? 'soft' : 'outline'}
        size="icon-lg"
        onClick={onFilters}
        aria-label={t('filters.button')}
        className={cn(
          'relative rounded-[10px]',
          filterCount === 0 && 'border-input bg-card text-muted-foreground',
        )}
      >
        <IconFilter2 size={18} />
        {filterCount > 0 && (
          <span className="bg-primary text-primary-foreground absolute -start-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-[5px] text-[11px] font-bold">
            {filterCount}
          </span>
        )}
      </Button>
      <button
        type="button"
        onClick={onSort}
        aria-label={sortLabel}
        className="border-input bg-card text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-[10px] border"
      >
        <IconArrowsSort size={18} />
      </button>
    </div>
  );
}

/** A removable chip that leads the filter chips, in their style. */
function LeadingChip({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-primary/8 text-primary border-primary/40 flex h-7 items-center gap-1.5 rounded-full border border-dashed ps-2.5 pe-2 text-[12.5px] font-semibold"
    >
      {children}
      <IconX size={13} stroke={2.4} />
    </button>
  );
}
