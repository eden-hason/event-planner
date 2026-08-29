'use client';

import * as React from 'react';
import { useLocale } from 'next-intl';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { groupGuests } from '../utils/grouping';
import { headCount } from '../utils/occupancy';
import { matchesQuery, SeatedSearchMatches } from './unassigned-panel';
import { SeatingHeaderActions } from './seating-header-actions';
import { SeatingProgress } from './seating-progress';
import { TableDetailPanel } from './table-detail-panel';
import { TableSummaryCard } from './table-summary-card';
import { UnassignedGroupSection } from './unassigned-group-section';
import { UnassignedGuestRow } from './unassigned-guest-row';
import {
  UnassignedViewSwitch,
  type UnassignedView,
} from './unassigned-view-switch';
import { useSeatingCopy } from './use-seating-copy';
import type { SeatingWorkspace } from './use-seating-workspace';

interface SeatingMobileProps {
  workspace: SeatingWorkspace;
  /** The Event's own group order, so sections read the same as on desktop. */
  groups: Array<{ id: string; name: string }>;
}

/**
 * Mobile reaches every operation through two tabs and no canvas (ADR-0009).
 *
 * Arranging tables in space is the one thing left out, and it is the one thing
 * that cannot change whether a plan is valid or complete - so a plan built
 * entirely here is as finished as one built on the canvas.
 */
export function SeatingMobile({ workspace, groups }: SeatingMobileProps) {
  const { t } = useSeatingCopy();
  // Radix Tabs' Root writes an explicit `dir` onto its wrapper div, defaulting
  // to `ltr` when no DirectionProvider is present - which overrides the
  // document direction and flips every row inside the tabs back to LTR. Hand it
  // the locale's direction so the mobile plan reads right-to-left in Hebrew.
  const dir = useLocale() === 'he' ? 'rtl' : 'ltr';
  const [view, setView] = React.useState<UnassignedView>('guests');

  const query = workspace.search.query;
  const searching = query.trim().length > 0;

  const openTable = workspace.tableById(workspace.openTableId);
  const selectedHeads = headCount(
    workspace.unassigned.filter((guest) =>
      workspace.selectedIds.includes(guest.id),
    ),
  );

  const visibleUnassigned = React.useMemo(
    () => workspace.unassigned.filter((guest) => matchesQuery(guest, query)),
    [workspace.unassigned, query],
  );

  const noMatchesAnywhere =
    searching &&
    visibleUnassigned.length === 0 &&
    workspace.search.seatedMatches.length === 0;

  // Built from the filtered list, so search reaches into both views alike.
  const sections = React.useMemo(
    () => (view === 'groups' ? groupGuests(visibleUnassigned, groups) : []),
    [view, visibleUnassigned, groups],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-3 px-4 pb-3">
        <h1 className="text-xl font-semibold">{t('title')}</h1>
        <SeatingHeaderActions
          compact
          onAddTable={() => workspace.setDialog({ kind: 'create' })}
          onAddBatch={() => workspace.setDialog({ kind: 'batch' })}
        />
      </div>

      <Tabs
        defaultValue="tables"
        dir={dir}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList className="mx-4 grid grid-cols-2">
          <TabsTrigger value="tables" className="gap-1.5">
            {t('tabs.tables')}
            <span className="text-muted-foreground text-xs tabular-nums">
              {workspace.tables.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="unassigned" className="gap-1.5">
            {t('tabs.unassigned')}
            <span className="text-muted-foreground text-xs tabular-nums">
              {workspace.unassigned.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="tables"
          className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4"
        >
          <SeatingProgress progress={workspace.progress} variant="mobile" />
          {workspace.tables.map((view) => (
            <TableSummaryCard
              key={view.table.id}
              view={view}
              onOpen={() => workspace.setOpenTableId(view.table.id)}
              onUnassign={workspace.unassign}
            />
          ))}
        </TabsContent>

        <TabsContent
          value="unassigned"
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="space-y-3 px-4 pb-3">
            <div className="relative">
              <Search className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2" />
              <Input
                value={query}
                onChange={(event) => workspace.setQuery(event.target.value)}
                placeholder={t('unassigned.searchPlaceholder')}
                className="ps-9"
              />
            </div>

            <UnassignedViewSwitch value={view} onChange={setView} />

            {searching && (
              <SeatedSearchMatches
                matches={workspace.search.seatedMatches}
                onReveal={workspace.revealGuest}
              />
            )}

            {noMatchesAnywhere && (
              <p className="text-muted-foreground text-xs">
                {t('unassigned.noMatches', { query: query.trim() })}
              </p>
            )}
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-4">
            {view === 'groups'
              ? sections.map((section) => (
                  <UnassignedGroupSection
                    key={section.id}
                    section={section}
                    selectedIds={workspace.selectedIds}
                    onToggleSelect={workspace.toggleSelect}
                    onSelectAll={workspace.selectMany}
                    onAssignOne={(guestId) => workspace.openAssign([guestId])}
                  />
                ))
              : visibleUnassigned.map((guest) => (
                  <UnassignedGuestRow
                    key={guest.id}
                    guest={guest}
                    selected={workspace.selectedIds.includes(guest.id)}
                    onToggle={() => workspace.toggleSelect(guest.id)}
                    onAssign={() => workspace.openAssign([guest.id])}
                  />
                ))}

            {visibleUnassigned.length === 0 && !searching && (
              <div className="text-muted-foreground py-12 text-center text-sm">
                <p>{t('unassigned.empty')}</p>
                <p className="mt-1 text-xs">{t('unassigned.emptyHint')}</p>
              </div>
            )}

            {visibleUnassigned.length === 0 &&
              searching &&
              !noMatchesAnywhere && (
                <p className="text-muted-foreground py-8 text-center text-xs">
                  {t('unassigned.allMatchesSeated')}
                </p>
              )}
          </div>

          {workspace.selectedIds.length > 0 && (
            <div className="border-border bg-card space-y-2 border-t p-4">
              <p className="text-xs font-medium">
                {t('unassigned.selectionLine', {
                  records: workspace.selectedIds.length,
                  heads: selectedHeads,
                })}
              </p>
              <Button
                type="button"
                className="w-full"
                onClick={() => workspace.openAssign(workspace.selectedIds)}
              >
                {t('unassigned.assignSelectedLong')}
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Sheet
        open={Boolean(openTable)}
        onOpenChange={(open) => !open && workspace.setOpenTableId(null)}
      >
        <SheetContent
          side="bottom"
          className={cn('max-h-[85svh] overflow-y-auto p-4')}
        >
          {openTable && (
            <>
              <SheetTitle className="sr-only">{t('title')}</SheetTitle>
              <TableDetailPanel
                view={openTable}
                highlightGuestId={workspace.highlightGuestId}
                className="w-full border-0 p-0"
                onClose={() => workspace.setOpenTableId(null)}
                onUnassign={workspace.unassign}
                onShapeChange={(shape) =>
                  workspace.patchTable(openTable, { shape })
                }
                onCapacityChange={(capacity) =>
                  workspace.patchTable(openTable, { capacity })
                }
                onEdit={() =>
                  workspace.setDialog({
                    kind: 'edit',
                    tableId: openTable.table.id,
                  })
                }
                onDelete={() =>
                  workspace.setDialog({
                    kind: 'delete',
                    tableId: openTable.table.id,
                  })
                }
              />
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
