'use client';

import * as React from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type Modifier,
} from '@dnd-kit/core';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import type { DraggableData, DroppableData, SeatingPageProps } from '../types';
import { snapToGrid } from '../utils/snap';
import { AssignDialog } from './assign-dialog';
import { BatchCreateDialog } from './batch-create-dialog';
import { DeleteTableDialog } from './delete-table-dialog';
import { ScopeBanner } from './scope-banner';
import { SeatingEmptyState } from './seating-empty-state';
import { SeatingHeaderActions } from './seating-header-actions';
import { SeatingMobile } from './seating-mobile';
import { SeatingProgress } from './seating-progress';
import { TableCanvas } from './table-canvas';
import { TableDetailPanel } from './table-detail-panel';
import { TableFormDialog } from './table-form-dialog';
import { UnassignedPanel } from './unassigned-panel';
import { useSeatingCopy } from './use-seating-copy';
import { useSeatingWorkspace } from './use-seating-workspace';

/**
 * The workspace scrolls nothing at the page level: the Unassigned list and the
 * canvas scroll independently inside it. `PageCard` gives the flat/seating
 * `Card` and `CardContent` a `flex-1 min-h-0` chain up to the viewport-height
 * `AppShell`, so filling with `flex-1 min-h-0` here rather than computing a
 * viewport-offset height directly means this never has to know how tall the
 * chrome above it happens to be.
 */
const WORKSPACE_HEIGHT = 'min-h-0 flex-1';

export function SeatingPage(props: SeatingPageProps) {
  const { t } = useSeatingCopy();
  const isMobile = useIsMobile();
  const workspace = useSeatingWorkspace(props);

  const [draggingGuestId, setDraggingGuestId] = React.useState<string | null>(null);

  // A few pixels of travel before a drag starts, so a tap still opens a table.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // Live grid snap for Table drags. The quantization happens in world units -
  // the Table's stored position plus the drag delta divided by the current
  // zoom - so the lattice stays pinned to the plan at any scale. Guest drags
  // share this DndContext and pass straight through untouched.
  const snapTableToGrid = React.useCallback<Modifier>(
    ({ transform, active }) => {
      const data = active?.data.current as DraggableData | undefined;
      if (data?.type !== 'table') return transform;

      const scale = workspace.scaleRef.current || 1;
      const snappedX = snapToGrid(data.positionX + transform.x / scale);
      const snappedY = snapToGrid(data.positionY + transform.y / scale);

      return {
        ...transform,
        x: (snappedX - data.positionX) * scale,
        y: (snappedY - data.positionY) * scale,
      };
    },
    [workspace.scaleRef],
  );

  // dnd-kit does not manage the cursor, and the Table drag has no DragOverlay to
  // carry one - so while something is moving the pointer falls back to the
  // arrow. Hold `grabbing` on the body for the length of the gesture.
  const setBodyGrabbing = (on: boolean) => {
    document.body.style.cursor = on ? 'grabbing' : '';
  };

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as DraggableData | undefined;
    if (data?.type === 'guest') setDraggingGuestId(data.guestId);
    setBodyGrabbing(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingGuestId(null);
    setBodyGrabbing(false);

    const active = event.active.data.current as DraggableData | undefined;
    if (!active) return;

    if (active.type === 'table') {
      const scale = workspace.scaleRef.current || 1;
      const view = workspace.tableById(active.tableId);
      if (!view) return;
      // No clamp at the origin: the canvas is an unbounded plane, and pinning
      // coordinates at zero put an invisible wall wherever the origin happened
      // to sit on screen (ADR-0005 - the arrangement is relative, not measured).
      // Snapped again here so the committed value matches the grid the modifier
      // showed during the drag, float error and all.
      workspace.moveTable(
        active.tableId,
        snapToGrid(view.table.positionX + event.delta.x / scale),
        snapToGrid(view.table.positionY + event.delta.y / scale),
      );
      return;
    }

    const over = event.over?.data.current as DroppableData | undefined;
    if (!over) return;

    // Drag-and-drop is a shortcut into the same operation the picker uses, so
    // it gets the same capacity validation and the same failure copy.
    if (over.type === 'table' && over.tableId !== active.currentTableId) {
      workspace.assign([active.guestId], over.tableId);
    } else if (over.type === 'unassigned' && active.currentTableId) {
      workspace.assign([active.guestId], null);
    }
  };

  const draggingGuest = workspace.guests.find((guest) => guest.id === draggingGuestId);
  const openTable = workspace.tableById(workspace.openTableId);
  const editingTable =
    workspace.dialog.kind === 'edit' ? workspace.tableById(workspace.dialog.tableId) : null;
  const deletingTable =
    workspace.dialog.kind === 'delete'
      ? workspace.tableById(workspace.dialog.tableId)
      : null;

  const scopedRecordCount = workspace.guests.length;
  const confirmedUnseated =
    workspace.progress.confirmedRecordsTotal -
    workspace.progress.confirmedRecordsSeated;

  const dialogs = (
    <>
      <AssignDialog
        open={workspace.dialog.kind === 'assign'}
        onOpenChange={(open) => !open && workspace.closeDialog()}
        tables={workspace.tables}
        guestNames={workspace.assignParty.names}
        partyHeads={workspace.assignParty.heads}
        error={workspace.dialogError}
        onPick={(tableId) => {
          if (workspace.dialog.kind !== 'assign') return;
          workspace.assign(workspace.dialog.guestIds, tableId);
        }}
      />

      <TableFormDialog
        open={workspace.dialog.kind === 'create' || workspace.dialog.kind === 'edit'}
        onOpenChange={(open) => !open && workspace.closeDialog()}
        table={editingTable?.table ?? null}
        nextNumber={workspace.nextNumber}
        highestNumber={workspace.highestNumber}
        seatedHeads={editingTable?.seatedHeads ?? 0}
        error={workspace.dialogError}
        isPending={workspace.isPending}
        onSubmit={workspace.submitTableForm}
      />

      <BatchCreateDialog
        open={workspace.dialog.kind === 'batch'}
        onOpenChange={(open) => !open && workspace.closeDialog()}
        usedNumbers={workspace.usedNumbers}
        nextNumber={workspace.nextNumber}
        error={workspace.dialogError}
        isPending={workspace.isPending}
        onSubmit={workspace.submitBatch}
      />

      <DeleteTableDialog
        view={deletingTable}
        onOpenChange={(open) => !open && workspace.closeDialog()}
        onConfirm={() => deletingTable && workspace.removeTable(deletingTable)}
      />
    </>
  );

  if (isMobile) {
    return (
      <div
        className={cn(
          WORKSPACE_HEIGHT,
          'flex min-h-0 flex-col overflow-hidden pt-4',
          // The fixed MobileBottomNav floats over the bottom of the viewport
          // (52px tall, 1rem from the edge). The workspace is full-bleed with no
          // page scroll, so without this the bottom bulk-selection bar and the
          // last unassigned rows sit underneath it. Clear the nav plus the
          // device safe-area inset.
          'pb-[calc(4.5rem+env(safe-area-inset-bottom))]',
        )}
      >
        {props.isScopedCollaborator && (
          <div className="px-4 pb-3">
            <ScopeBanner scopedRecordCount={scopedRecordCount} />
          </div>
        )}
        <SeatingMobile workspace={workspace} groups={props.groups} />
        {dialogs}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      modifiers={[snapTableToGrid]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setDraggingGuestId(null);
        setBodyGrabbing(false);
      }}
    >
      {/*
        `flex-1`, not `h-full`: on this route `PageCard` makes the Card and
        CardContent around this a `flex-1 min-h-0` chain rather than giving
        them a resolvable height, so a percentage height here would have
        nothing to resolve against and collapse to auto - which lets the
        canvas grow to its full world size and drags the whole page with it.
      */}
      <div
        className={cn(
          WORKSPACE_HEIGHT,
          'flex min-h-0 flex-col gap-4 overflow-hidden p-6',
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold">{t('title')}</h1>
          <SeatingHeaderActions
            onAddTable={() => workspace.setDialog({ kind: 'create' })}
            onAddBatch={() => workspace.setDialog({ kind: 'batch' })}
          />
        </div>

        {props.isScopedCollaborator && (
          <ScopeBanner scopedRecordCount={scopedRecordCount} />
        )}

        {workspace.tables.length === 0 ? (
          <SeatingEmptyState
            confirmedUnseated={confirmedUnseated}
            onBatch={() => workspace.setDialog({ kind: 'batch' })}
            onSingle={() => workspace.setDialog({ kind: 'create' })}
          />
        ) : (
          <>
            <SeatingProgress progress={workspace.progress} />

            <div className="flex min-h-0 min-w-0 flex-1 gap-4">
              <UnassignedPanel
                className="w-80 shrink-0"
                unassigned={workspace.unassigned}
                groups={props.groups}
                query={workspace.search.query}
                onQueryChange={workspace.setQuery}
                seatedMatches={workspace.search.seatedMatches}
                onRevealGuest={workspace.revealGuest}
                selectedIds={workspace.selectedIds}
                onToggleSelect={workspace.toggleSelect}
                onSelectMany={workspace.selectMany}
                onClearSelection={workspace.clearSelection}
                onAssignOne={(guestId) => workspace.openAssign([guestId])}
                onAssignSelected={() => workspace.openAssign(workspace.selectedIds)}
                draggable
              />

              <TableCanvas
                tables={workspace.tables}
                openTableId={workspace.openTableId}
                onOpenTable={workspace.setOpenTableId}
                scaleRef={workspace.scaleRef}
              >
                {openTable && (
                  // Stacked directly above the zoom controls, which sit at `bottom-4`
                  // and stand 2.25rem tall. Same corner, so both stay where the eye
                  // already looks, and neither covers the other.
                  <div className="absolute bottom-16 start-4 z-40">
                    <TableDetailPanel
                      view={openTable}
                      highlightGuestId={workspace.highlightGuestId}
                      onClose={() => workspace.setOpenTableId(null)}
                      onUnassign={workspace.unassign}
                      onShapeChange={(shape) => workspace.patchTable(openTable, { shape })}
                      onRotationChange={(rotation) =>
                        workspace.patchTable(openTable, { rotation })
                      }
                      onCapacityChange={(capacity) =>
                        workspace.patchTable(openTable, { capacity })
                      }
                      onEdit={() =>
                        workspace.setDialog({ kind: 'edit', tableId: openTable.table.id })
                      }
                      onDelete={() =>
                        workspace.setDialog({ kind: 'delete', tableId: openTable.table.id })
                      }
                    />
                  </div>
                )}
              </TableCanvas>
            </div>
          </>
        )}
      </div>

      <DragOverlay dropAnimation={null}>
        {draggingGuest && (
          // Deliberately small: the overlay follows the cursor over the canvas, and
          // anything larger hides the very table the planner is aiming at.
          <div className="bg-card border-primary flex max-w-40 items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium">
            <span className="truncate">{draggingGuest.name}</span>
            <span className="text-muted-foreground shrink-0 tabular-nums">
              {draggingGuest.amount ?? 1}
            </span>
          </div>
        )}
      </DragOverlay>

      {dialogs}
    </DndContext>
  );
}
