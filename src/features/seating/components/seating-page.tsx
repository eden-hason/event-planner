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
} from '@dnd-kit/core';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  createTable,
  updateTable,
  deleteTable,
  updateTablePosition,
  assignGuestToTable,
} from '../actions';
import { FloorPlanCanvas } from './floor-plan-canvas';
import { UnassignedGuestsPanel } from './unassigned-guests-panel';
import { GuestCard } from './guest-card';
import { CreateTableDialog } from './create-table-dialog';
import { EditTableSheet } from './edit-table-sheet';
import { SeatingStats } from './seating-stats';
import { SeatingMobilePlaceholder } from './seating-mobile-placeholder';
import { tableOccupancy } from '../utils/occupancy';
import type { CanvasTool } from './canvas-shape-toolbar';
import type { SeatingPageProps, TableWithGuestsApp } from '../types';
import type { GuestWithGroupApp } from '@/features/guests/schemas';
import type { TableApp, TableShape } from '../schemas';

const POSITION_DEBOUNCE_MS = 300;

export function SeatingPage({
  eventId,
  tables: initialTables,
  guests: initialGuests,
  groups,
}: SeatingPageProps) {
  const t = useTranslations('seating');
  const isMobile = useIsMobile();

  const stripGuests = React.useCallback(
    (rows: TableWithGuestsApp[]): TableApp[] =>
      rows.map((row) => {
        const {
          id,
          eventId: eId,
          label,
          tableNumber,
          shape,
          capacity,
          positionX,
          positionY,
          rotation,
          createdAt,
          updatedAt,
        } = row;
        return {
          id,
          eventId: eId,
          label,
          tableNumber,
          shape,
          capacity,
          positionX,
          positionY,
          rotation,
          createdAt,
          updatedAt,
        };
      }),
    [],
  );

  const [tables, setTables] = React.useState<TableApp[]>(() => stripGuests(initialTables));
  const [guests, setGuests] = React.useState<GuestWithGroupApp[]>(initialGuests);
  const [activeDragGuest, setActiveDragGuest] = React.useState<GuestWithGroupApp | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editTableId, setEditTableId] = React.useState<string | null>(null);
  const [tool, setTool] = React.useState<CanvasTool>('move');

  // Re-sync from server props on revalidation
  React.useEffect(() => {
    setTables(stripGuests(initialTables));
    setGuests(initialGuests);
  }, [initialTables, initialGuests, stripGuests]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const tablesWithGuests: TableWithGuestsApp[] = React.useMemo(() => {
    const byTable = new Map<string, GuestWithGroupApp[]>();
    for (const g of guests) {
      if (g.tableId) {
        const arr = byTable.get(g.tableId) ?? [];
        arr.push(g);
        byTable.set(g.tableId, arr);
      }
    }
    return tables.map((tbl) => ({ ...tbl, guests: byTable.get(tbl.id) ?? [] }));
  }, [tables, guests]);

  const unassignedGuests = React.useMemo(
    () => guests.filter((g) => !g.tableId),
    [guests],
  );

  const liveStats = React.useMemo(() => {
    let seatedHead = 0;
    let seatedCount = 0;
    let totalHead = 0;
    for (const g of guests) {
      totalHead += g.amount;
      if (g.tableId) {
        seatedHead += g.amount;
        seatedCount += 1;
      }
    }
    const totalCapacity = tables.reduce((sum, t) => sum + t.capacity, 0);
    const fullTables = tablesWithGuests.filter((t) => {
      const { seatedHeadCount } = tableOccupancy(t.capacity, t.guests);
      return seatedHeadCount >= t.capacity && t.capacity > 0;
    }).length;

    return {
      totalGuests: guests.length,
      totalHeadCount: totalHead,
      seatedGuestCount: seatedCount,
      seatedHeadCount: seatedHead,
      totalCapacity,
      totalTables: tables.length,
      fullTables,
    };
  }, [guests, tables, tablesWithGuests]);

  const zoomScaleRef = React.useRef(1);

  const positionDebouncers = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const queueSavePosition = React.useCallback(
    (tableId: string, x: number, y: number) => {
      const existing = positionDebouncers.current.get(tableId);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        updateTablePosition(tableId, x, y).then((r) => {
          if (!r.success && r.message) toast.error(r.message);
        });
        positionDebouncers.current.delete(tableId);
      }, POSITION_DEBOUNCE_MS);
      positionDebouncers.current.set(tableId, timer);
    },
    [],
  );

  React.useEffect(
    () => () => {
      positionDebouncers.current.forEach((t) => clearTimeout(t));
    },
    [],
  );

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as
      | { type: 'guest'; guestId: string }
      | { type: 'table'; tableId: string }
      | undefined;
    if (data?.type === 'guest') {
      const guest = guests.find((g) => g.id === data.guestId) ?? null;
      setActiveDragGuest(guest);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragGuest(null);
    const data = event.active.data.current as
      | { type: 'guest'; guestId: string; currentTableId: string | null }
      | { type: 'table'; tableId: string }
      | undefined;
    if (!data) return;

    if (data.type === 'table') {
      const dx = event.delta.x;
      const dy = event.delta.y;
      const table = tables.find((t) => t.id === data.tableId);
      if (!table) return;
      const scale = zoomScaleRef.current;
      const newX = Math.max(0, table.positionX + dx / scale);
      const newY = Math.max(0, table.positionY + dy / scale);
      setTables((prev) =>
        prev.map((t) =>
          t.id === data.tableId ? { ...t, positionX: newX, positionY: newY } : t,
        ),
      );
      queueSavePosition(data.tableId, newX, newY);
      return;
    }

    // Guest drop
    const overData = event.over?.data.current as
      | { type: 'table'; tableId: string }
      | { type: 'unassigned' }
      | undefined;
    if (!event.over || !overData) return;

    const targetTableId =
      overData.type === 'table' ? overData.tableId : null;
    if (targetTableId === data.currentTableId) return;

    const prevTableId = data.currentTableId;
    setGuests((prev) =>
      prev.map((g) =>
        g.id === data.guestId ? { ...g, tableId: targetTableId } : g,
      ),
    );

    assignGuestToTable(eventId, data.guestId, targetTableId).then((result) => {
      if (!result.success) {
        setGuests((prev) =>
          prev.map((g) =>
            g.id === data.guestId ? { ...g, tableId: prevTableId } : g,
          ),
        );
        toast.error(result.message ?? t('errors.assignFailed'));
      }
    });
  };

  const handleCreateTable = React.useCallback(
    (formData: FormData) => {
      const promise = createTable(eventId, formData).then((result) => {
        if (!result.success || !result.table) {
          throw new Error(result.message ?? t('errors.createFailed'));
        }
        setTables((prev) => [...prev, result.table!]);
        return result;
      });
      toast.promise(promise, {
        loading: t('toast.creating'),
        success: t('toast.created'),
        error: (err) =>
          err instanceof Error ? err.message : t('errors.createFailed'),
      });
    },
    [eventId, t],
  );

  const handleAddTableWithShape = React.useCallback(
    (shape: TableShape) => {
      const fd = new FormData();
      fd.append('shape', shape);
      fd.append('capacity', '8');
      handleCreateTable(fd);
    },
    [handleCreateTable],
  );

  const handlePlaceTable = React.useCallback(
    (shape: Exclude<CanvasTool, 'move'>, x: number, y: number) => {
      setTool('move');
      const fd = new FormData();
      fd.append('shape', shape);
      fd.append('capacity', '8');
      fd.append('positionX', String(Math.round(x)));
      fd.append('positionY', String(Math.round(y)));
      handleCreateTable(fd);
    },
    [handleCreateTable],
  );

  const handleUpdateTable = (formData: FormData) => {
    const promise = updateTable(eventId, formData).then((result) => {
      if (!result.success || !result.table) {
        throw new Error(result.message ?? t('errors.updateFailed'));
      }
      const updated = result.table;
      setTables((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setEditTableId(null);
      return result;
    });
    toast.promise(promise, {
      loading: t('toast.updating'),
      success: t('toast.updated'),
      error: (err) =>
        err instanceof Error ? err.message : t('errors.updateFailed'),
    });
  };

  const handleDeleteTable = () => {
    if (!editTableId) return;
    const tableId = editTableId;
    const promise = deleteTable(eventId, tableId).then((result) => {
      if (!result.success) {
        throw new Error(result.message ?? t('errors.deleteFailed'));
      }
      setTables((prev) => prev.filter((t) => t.id !== tableId));
      setGuests((prev) =>
        prev.map((g) => (g.tableId === tableId ? { ...g, tableId: null } : g)),
      );
      setEditTableId(null);
      return result;
    });
    toast.promise(promise, {
      loading: t('toast.deleting'),
      success: t('toast.deleted'),
      error: (err) =>
        err instanceof Error ? err.message : t('errors.deleteFailed'),
    });
  };

  const handleUnassignGuest = (guestId: string) => {
    const prev = guests.find((g) => g.id === guestId);
    const prevTableId = prev?.tableId ?? null;
    setGuests((arr) =>
      arr.map((g) => (g.id === guestId ? { ...g, tableId: null } : g)),
    );
    assignGuestToTable(eventId, guestId, null).then((result) => {
      if (!result.success) {
        setGuests((arr) =>
          arr.map((g) =>
            g.id === guestId ? { ...g, tableId: prevTableId } : g,
          ),
        );
        toast.error(result.message ?? t('errors.assignFailed'));
      }
    });
  };

  if (isMobile) {
    return <SeatingMobilePlaceholder />;
  }

  const editingTable = tablesWithGuests.find((t) => t.id === editTableId) ?? null;

  return (
    <div className="flex h-svh flex-col">
      <SeatingStats stats={liveStats} />

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 overflow-hidden">
          <UnassignedGuestsPanel
            guests={unassignedGuests}
            groups={groups}
            onAddTableClick={() => setCreateOpen(true)}
            onAddTableWithShape={handleAddTableWithShape}
            onAddGuestClick={() => {
              toast.info(t('addGuest'));
            }}
          />
          <div className="relative flex-1">
            <FloorPlanCanvas
              tables={tablesWithGuests}
              groups={groups}
              onSelectTable={(id) => setEditTableId(id)}
              scaleRef={zoomScaleRef}
              tool={tool}
              onToolChange={setTool}
              onPlaceTable={handlePlaceTable}
            />
            {tablesWithGuests.length === 0 ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">{t('canvas.empty')}</p>
              </div>
            ) : null}
            <EditTableSheet
              table={editingTable}
              onOpenChange={(o) => !o && setEditTableId(null)}
              onSave={handleUpdateTable}
              onDelete={handleDeleteTable}
              onUnassignGuest={handleUnassignGuest}
            />
          </div>
        </div>

        <DragOverlay>
          {activeDragGuest ? (
            <div className="rotate-1 opacity-90">
              <GuestCard guest={activeDragGuest} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <CreateTableDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreateTable}
        nextTableNumber={
          tables.reduce((m, t) => Math.max(m, t.tableNumber ?? 0), 0) + 1
        }
      />

    </div>
  );
}
