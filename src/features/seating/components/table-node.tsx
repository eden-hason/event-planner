'use client';

import * as React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import type { TableView } from '../types';
import { tableFootprint } from '../utils/seat-layout';
import { TableSeatDiagram } from './table-seat-diagram';
import { useSeatingCopy } from './use-seating-copy';

interface TableNodeProps {
  view: TableView;
  isOpen: boolean;
  /** Canvas zoom, so the drag delta can be converted back to world units. */
  scale: number;
  onOpen: () => void;
}

/**
 * One Table on the canvas.
 *
 * It is both draggable (arranging the room) and droppable (assigning a guest),
 * which is why the two dnd-kit refs are merged onto a single node. The position
 * it carries is an arrangement aid only: nothing here reads or writes capacity
 * (ADR-0005, ADR-0008).
 */
export function TableNode({ view, isOpen, scale, onOpen }: TableNodeProps) {
  const { t, tableTitle, remainingPill } = useSeatingCopy();
  const { table, occupancy, seatedHeads, freeSeats } = view;

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `table:${table.id}`,
    data: {
      type: 'table',
      tableId: table.id,
      positionX: table.positionX,
      positionY: table.positionY,
    },
  });

  const {
    setNodeRef: setDropRef,
    isOver,
    active: activeDraggable,
  } = useDroppable({
    id: `drop-table:${table.id}`,
    data: { type: 'table', tableId: table.id },
  });

  // Only a guest drag can land on a Table. Dragging one Table across another is
  // just rearranging the room, so the table underneath must not light up as a
  // drop target.
  const isGuestOver =
    isOver && activeDraggable?.data.current?.type === 'guest';

  const setRefs = React.useCallback(
    (node: HTMLElement | null) => {
      setDragRef(node);
      setDropRef(node);
    },
    [setDragRef, setDropRef],
  );

  // A drag that started a click should not also open the panel.
  const draggedRef = React.useRef(false);
  React.useEffect(() => {
    if (isDragging) draggedRef.current = true;
  }, [isDragging]);

  const layout = tableFootprint(table.shape, table.capacity, table.rotation);

  const offsetX = transform ? transform.x / scale : 0;
  const offsetY = transform ? transform.y / scale : 0;

  return (
    <div
      ref={setRefs}
      {...listeners}
      {...attributes}
      role="button"
      tabIndex={0}
      onClick={() => {
        if (draggedRef.current) {
          draggedRef.current = false;
          return;
        }
        onOpen();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      style={{
        position: 'absolute',
        left: table.positionX + offsetX,
        top: table.positionY + offsetY,
        width: layout.width,
        zIndex: isDragging ? 30 : isOpen ? 20 : 10,
      }}
      className={cn(
        'group cursor-grab touch-none select-none active:cursor-grabbing',
        isDragging && 'opacity-90',
      )}
    >
      <div className="relative" style={{ height: layout.height }}>
        <TableSeatDiagram
          shape={table.shape}
          rotation={table.rotation}
          capacity={table.capacity}
          confirmedHeads={occupancy.confirmedHeads}
          pendingHeads={occupancy.pendingHeads}
          isDropTarget={isGuestOver}
        />
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              'text-lg leading-none font-semibold tabular-nums transition-colors',
              isGuestOver ? 'text-primary' : 'text-foreground',
            )}
          >
            {table.tableNumber}
          </span>
          <span className="text-muted-foreground mt-0.5 text-[10px] tabular-nums">
            {t('table.seatSummary', { seated: seatedHeads, capacity: table.capacity })}
          </span>
        </div>
      </div>

      <div className="mt-1 text-center">
        <p className="truncate text-xs font-medium">{tableTitle(table)}</p>
        <p className="text-muted-foreground text-[10px]">{remainingPill(freeSeats)}</p>
      </div>
    </div>
  );
}
