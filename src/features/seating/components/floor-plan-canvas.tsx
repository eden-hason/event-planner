'use client';

import * as React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { TableShape, TABLE_DIMENSIONS } from './table-shape';
import { CanvasShapeToolbar } from './canvas-shape-toolbar';
import { CanvasGroupsLegend } from './canvas-groups-legend';
import { CanvasZoomControls } from './canvas-zoom-controls';
import { tableOccupancy } from '../utils/occupancy';
import type { TableWithGuestsApp } from '../types';
import type { CanvasTool } from './canvas-shape-toolbar';

const MIN_SCALE = 0.2;
const MAX_SCALE = 3;
const ZOOM_FACTOR = 1.15;
const CANVAS_WIDTH = 4000;
const CANVAS_HEIGHT = 3000;
const PAN_PADDING = 150;
const FIT_PADDING = 80;

function clampTranslate(tx: number, ty: number, scale: number, cw: number, ch: number) {
  return {
    tx: Math.min(PAN_PADDING, Math.max(cw - CANVAS_WIDTH * scale - PAN_PADDING, tx)),
    ty: Math.min(PAN_PADDING, Math.max(ch - CANVAS_HEIGHT * scale - PAN_PADDING, ty)),
  };
}

interface FloorPlanCanvasProps {
  tables: TableWithGuestsApp[];
  groups: Array<{ id: string; name: string; icon: string | null }>;
  onSelectTable: (tableId: string) => void;
  scaleRef?: React.MutableRefObject<number>;
  tool: CanvasTool;
  onToolChange: (tool: CanvasTool) => void;
  onPlaceTable: (shape: Exclude<CanvasTool, 'move'>, x: number, y: number) => void;
}

export function FloorPlanCanvas({
  tables,
  groups,
  onSelectTable,
  scaleRef,
  tool,
  onToolChange,
  onPlaceTable,
}: FloorPlanCanvasProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = React.useState({ scale: 1, tx: 0, ty: 0 });
  const [highlightGroupId, setHighlightGroupId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (scaleRef) scaleRef.current = viewport.scale;
  }, [viewport.scale, scaleRef]);

  const zoomIn = React.useCallback(() => {
    setViewport((prev) => {
      const el = containerRef.current;
      if (!el) return prev;
      const { clientWidth: cw, clientHeight: ch } = el;
      const cx = cw / 2;
      const cy = ch / 2;
      const newScale = Math.min(MAX_SCALE, prev.scale * ZOOM_FACTOR);
      const rawTx = cx - ((cx - prev.tx) / prev.scale) * newScale;
      const rawTy = cy - ((cy - prev.ty) / prev.scale) * newScale;
      return { scale: newScale, ...clampTranslate(rawTx, rawTy, newScale, cw, ch) };
    });
  }, []);

  const zoomOut = React.useCallback(() => {
    setViewport((prev) => {
      const el = containerRef.current;
      if (!el) return prev;
      const { clientWidth: cw, clientHeight: ch } = el;
      const cx = cw / 2;
      const cy = ch / 2;
      const newScale = Math.max(MIN_SCALE, prev.scale / ZOOM_FACTOR);
      const rawTx = cx - ((cx - prev.tx) / prev.scale) * newScale;
      const rawTy = cy - ((cy - prev.ty) / prev.scale) * newScale;
      return { scale: newScale, ...clampTranslate(rawTx, rawTy, newScale, cw, ch) };
    });
  }, []);

  const fitView = React.useCallback(() => {
    if (tables.length === 0) return;
    const el = containerRef.current;
    if (!el) return;
    const { clientWidth: cw, clientHeight: ch } = el;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const t of tables) {
      const dims = TABLE_DIMENSIONS[t.shape];
      minX = Math.min(minX, t.positionX);
      minY = Math.min(minY, t.positionY);
      maxX = Math.max(maxX, t.positionX + dims.width);
      maxY = Math.max(maxY, t.positionY + dims.height);
    }

    const contentW = maxX - minX;
    const contentH = maxY - minY;
    const scaleX = (cw - FIT_PADDING * 2) / contentW;
    const scaleY = (ch - FIT_PADDING * 2) / contentH;
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.min(scaleX, scaleY)));

    const tx = (cw - contentW * newScale) / 2 - minX * newScale;
    const ty = (ch - contentH * newScale) / 2 - minY * newScale;

    setViewport({ scale: newScale, ...clampTranslate(tx, ty, newScale, cw, ch) });
  }, [tables]);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { clientWidth: cw, clientHeight: ch } = el;
      if (e.ctrlKey || e.metaKey) {
        const rect = el.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        setViewport((prev) => {
          const factor = e.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
          const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * factor));
          const rawTx = cx - ((cx - prev.tx) / prev.scale) * newScale;
          const rawTy = cy - ((cy - prev.ty) / prev.scale) * newScale;
          return { scale: newScale, ...clampTranslate(rawTx, rawTy, newScale, cw, ch) };
        });
      } else if (e.shiftKey) {
        const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
        setViewport((prev) => {
          const { tx } = clampTranslate(prev.tx - delta, prev.ty, prev.scale, cw, ch);
          return { ...prev, tx };
        });
      } else {
        setViewport((prev) => {
          const { ty } = clampTranslate(prev.tx, prev.ty - e.deltaY, prev.scale, cw, ch);
          return { ...prev, ty };
        });
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Click-to-place handler on the canvas world div
  const handleWorldClick = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (tool === 'move') return;
      // Only fires when clicking empty canvas space (not a table)
      if (e.target !== e.currentTarget) return;
      const rect = containerRef.current!.getBoundingClientRect();
      const canvasX = (e.clientX - rect.left - viewport.tx) / viewport.scale;
      const canvasY = (e.clientY - rect.top - viewport.ty) / viewport.scale;
      onPlaceTable(tool, Math.max(0, canvasX), Math.max(0, canvasY));
    },
    [tool, viewport, onPlaceTable],
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative h-full w-full overflow-hidden bg-[#F8F8FB] bg-[radial-gradient(circle,_var(--color-border)_1.5px,_transparent_1.5px)] [background-size:24px_24px]',
        tool !== 'move' && 'cursor-crosshair',
      )}
    >
      {/* Shape placement toolbar */}
      <CanvasShapeToolbar tool={tool} onToolChange={onToolChange} />

      <div
        className="absolute inset-0"
        style={{
          transformOrigin: '0 0',
          transform: `translate(${viewport.tx}px, ${viewport.ty}px) scale(${viewport.scale})`,
        }}
        onClick={handleWorldClick}
      >
        {tables.map((t) => (
          <DraggableTable
            key={t.id}
            table={t}
            onSelect={() => onSelectTable(t.id)}
            scale={viewport.scale}
            highlightGroupId={highlightGroupId}
          />
        ))}
      </div>

      {/* Groups legend */}
      <CanvasGroupsLegend
        groups={groups}
        highlightGroupId={highlightGroupId}
        onHighlightChange={setHighlightGroupId}
      />

      {/* Zoom controls */}
      <CanvasZoomControls
        scale={viewport.scale}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFitView={fitView}
      />
    </div>
  );
}

interface DraggableTableProps {
  table: TableWithGuestsApp;
  onSelect: () => void;
  scale: number;
  highlightGroupId: string | null;
}

function DraggableTable({ table, onSelect, scale, highlightGroupId }: DraggableTableProps) {
  const dims = TABLE_DIMENSIONS[table.shape];

  const { setNodeRef: setDraggableRef, attributes, listeners, transform, isDragging } =
    useDraggable({
      id: `table:${table.id}`,
      data: { type: 'table', tableId: table.id },
    });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `drop-table:${table.id}`,
    data: { type: 'table', tableId: table.id },
  });

  const ref = React.useCallback(
    (node: HTMLDivElement | null) => {
      setDraggableRef(node);
      setDroppableRef(node);
    },
    [setDraggableRef, setDroppableRef],
  );

  const occupancy = tableOccupancy(table.capacity, table.guests);

  const style: React.CSSProperties = {
    position: 'absolute',
    left: table.positionX,
    top: table.positionY,
    width: dims.width,
    height: dims.height,
    transform: transform
      ? `translate3d(${transform.x / scale}px, ${transform.y / scale}px, 0)`
      : undefined,
    zIndex: isDragging ? 50 : undefined,
    cursor: isDragging ? 'grabbing' : 'grab',
    touchAction: 'none',
  };

  const wasDraggingRef = React.useRef(false);
  React.useEffect(() => {
    if (isDragging) wasDraggingRef.current = true;
  }, [isDragging]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // prevent canvas click-to-place from firing
    if (wasDraggingRef.current) {
      wasDraggingRef.current = false;
      return;
    }
    onSelect();
  };

  return (
    <div
      ref={ref}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={cn('select-none', isDragging && 'opacity-80')}
      aria-label={`Table ${table.label ?? table.tableNumber}`}
    >
      <TableShape
        shape={table.shape}
        label={table.label}
        tableNumber={table.tableNumber}
        seatedHeadCount={occupancy.seatedHeadCount}
        capacity={table.capacity}
        guests={table.guests}
        isOver={isOver}
        highlightGroupId={highlightGroupId}
        className="h-full w-full"
      />
    </div>
  );
}
