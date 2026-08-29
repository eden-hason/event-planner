'use client';

import * as React from 'react';
import type { TableView } from '../types';
import { tableFootprint } from '../utils/seat-layout';
import { SNAP_GRID } from '../utils/snap';
import { CanvasZoomControls } from './canvas-zoom-controls';
import { TableNode } from './table-node';

/**
 * The zoom ladder the buttons step through.
 *
 * Six named stops rather than a multiplier: a planner zooms to read a table or
 * to see the whole room, not to land on 87%. Free zoom stays available on
 * ctrl/pinch + wheel, which is continuous within the same bounds.
 */
const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.5, 2];
const MIN_SCALE = ZOOM_LEVELS[0];
const MAX_SCALE = ZOOM_LEVELS[ZOOM_LEVELS.length - 1];
const ZOOM_FACTOR = 1.15;
const ZOOM_EPSILON = 0.001;
/** How much of the plan must stay on screen, so a pan can never lose it. */
const PAN_KEEP = 120;
const FIT_PADDING = 48;

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** The box the Tables actually occupy, in world units. */
function contentBounds(tables: TableView[]): Bounds | null {
  if (tables.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const { table } of tables) {
    const box = tableFootprint(table.shape, table.capacity, table.rotation);
    minX = Math.min(minX, table.positionX);
    minY = Math.min(minY, table.positionY);
    maxX = Math.max(maxX, table.positionX + box.width);
    maxY = Math.max(maxY, table.positionY + box.height);
  }

  return { minX, minY, maxX, maxY };
}

/**
 * Pan limits follow the plan, not a fixed world rectangle.
 *
 * The canvas used to be a 4000x3000 box with coordinates clamped at its origin,
 * which put an invisible wall wherever that origin happened to land on screen:
 * a planner dragging a Table towards the edge of the view would simply stop
 * being able to move it. The plane is unbounded instead, and the only rule is
 * that some of the arrangement stays in sight.
 */
function clampTranslate(
  tx: number,
  ty: number,
  scale: number,
  width: number,
  height: number,
  bounds: Bounds | null,
) {
  if (!bounds) return { tx, ty };

  return {
    tx: Math.min(
      width - PAN_KEEP - bounds.minX * scale,
      Math.max(PAN_KEEP - bounds.maxX * scale, tx),
    ),
    ty: Math.min(
      height - PAN_KEEP - bounds.minY * scale,
      Math.max(PAN_KEEP - bounds.maxY * scale, ty),
    ),
  };
}

interface TableCanvasProps {
  tables: TableView[];
  openTableId: string | null;
  onOpenTable: (tableId: string | null) => void;
  /** Read during drag so a delta in screen pixels becomes world units. */
  scaleRef: React.MutableRefObject<number>;
  children?: React.ReactNode;
}

/**
 * The arrangement surface.
 *
 * Under ADR-0005 this expresses the useful relative arrangement of Tables, not
 * a measured venue: there is no scale, no room boundary, no fixture, and no
 * collision handling. Nothing a planner does here changes whether the plan is
 * valid or complete - it only changes where the tables sit.
 */
export function TableCanvas({
  tables,
  openTableId,
  onOpenTable,
  scaleRef,
  children,
}: TableCanvasProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = React.useState({ scale: 1, tx: 0, ty: 0 });

  // Read from inside the zoom and wheel handlers, which are deliberately not
  // rebuilt on every move - the wheel listener is non-passive and re-binding it
  // mid-gesture would drop events.
  const bounds = React.useMemo(() => contentBounds(tables), [tables]);
  const boundsRef = React.useRef(bounds);
  boundsRef.current = bounds;

  React.useEffect(() => {
    scaleRef.current = viewport.scale;
  }, [viewport.scale, scaleRef]);

  // Screen pitch of the dotted grid a dragged Table snaps to. It is the world
  // grid scaled by zoom, then doubled until it clears a comfortable spacing -
  // so zoomed out the dots thin to every second or fourth snap line rather than
  // turning to noise. Every drawn dot still sits on a true snap point.
  const gridPitch = React.useMemo(() => {
    let pitch = SNAP_GRID * viewport.scale;
    while (pitch < 18) pitch *= 2;
    return pitch;
  }, [viewport.scale]);

  /**
   * Step to the next stop on the ladder, keeping the centre of the viewport
   * fixed. The epsilon matters because a free zoom or a fit can leave the scale
   * a hair off a stop, and without it the next click would land back on the
   * value it already has.
   */
  const stepZoom = React.useCallback((direction: 1 | -1) => {
    setViewport((prev) => {
      const el = containerRef.current;
      if (!el) return prev;

      const scale =
        direction > 0
          ? (ZOOM_LEVELS.find((level) => level > prev.scale + ZOOM_EPSILON) ?? MAX_SCALE)
          : ([...ZOOM_LEVELS]
              .reverse()
              .find((level) => level < prev.scale - ZOOM_EPSILON) ?? MIN_SCALE);
      if (scale === prev.scale) return prev;

      const { clientWidth: width, clientHeight: height } = el;
      const cx = width / 2;
      const cy = height / 2;
      const rawTx = cx - ((cx - prev.tx) / prev.scale) * scale;
      const rawTy = cy - ((cy - prev.ty) / prev.scale) * scale;
      return {
        scale,
        ...clampTranslate(rawTx, rawTy, scale, width, height, boundsRef.current),
      };
    });
  }, []);

  /**
   * `maxScale` lets the automatic fit on mount stop at 1:1. Without it, an
   * Event with a single Table would open zoomed all the way in on that one
   * table, which looks broken rather than helpful.
   */
  const fitView = React.useCallback((maxScale: number = MAX_SCALE) => {
    const el = containerRef.current;
    if (!el || !bounds) return;
    const { clientWidth: width, clientHeight: height } = el;
    if (width === 0 || height === 0) return;

    const { minX, minY, maxX, maxY } = bounds;
    const contentWidth = Math.max(maxX - minX, 1);
    const contentHeight = Math.max(maxY - minY, 1);
    const scale = Math.min(
      maxScale,
      Math.max(
        MIN_SCALE,
        Math.min(
          (width - FIT_PADDING * 2) / contentWidth,
          (height - FIT_PADDING * 2) / contentHeight,
        ),
      ),
    );

    const tx = (width - contentWidth * scale) / 2 - minX * scale;
    const ty = (height - contentHeight * scale) / 2 - minY * scale;
    setViewport({ scale, ...clampTranslate(tx, ty, scale, width, height, bounds) });
  }, [bounds]);

  /**
   * Fit once, as soon as there is something to fit and a box to fit it into.
   * Positions are free-form and persist across sessions, so without this a
   * planner who dragged everything into one corner could come back to what
   * looks like an empty canvas.
   */
  const hasFitted = React.useRef(false);
  React.useEffect(() => {
    if (hasFitted.current || tables.length === 0) return;
    const el = containerRef.current;
    if (!el || el.clientWidth === 0 || el.clientHeight === 0) return;
    hasFitted.current = true;
    fitView(1);
  }, [tables, fitView]);

  // Non-passive so the page does not scroll out from under a pinch or a pan.
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const { clientWidth: width, clientHeight: height } = el;

      if (event.ctrlKey || event.metaKey) {
        const rect = el.getBoundingClientRect();
        const cx = event.clientX - rect.left;
        const cy = event.clientY - rect.top;
        setViewport((prev) => {
          const factor = event.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
          const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * factor));
          const rawTx = cx - ((cx - prev.tx) / prev.scale) * scale;
          const rawTy = cy - ((cy - prev.ty) / prev.scale) * scale;
          return {
            scale,
            ...clampTranslate(rawTx, rawTy, scale, width, height, boundsRef.current),
          };
        });
        return;
      }

      const deltaX = event.shiftKey && event.deltaX === 0 ? event.deltaY : event.deltaX;
      setViewport((prev) =>
        ({
          ...prev,
          ...clampTranslate(
            prev.tx - deltaX,
            prev.ty - (event.shiftKey ? 0 : event.deltaY),
            prev.scale,
            width,
            height,
            boundsRef.current,
          ),
        }),
      );
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-xl"
      onClick={(event) => {
        if (event.target === event.currentTarget) onOpenTable(null);
      }}
    >
      {/*
        The snap grid, drawn as a CSS dot pattern anchored to the world origin
        (`backgroundPosition` tracks the pan) and scaled with zoom. Every dot is
        a true snap point; zoomed far out `gridPitch` draws only every second or
        fourth one. First child and un-layered, so it paints behind the Tables
        without needing a z-index.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'radial-gradient(color-mix(in oklch, var(--border) 60%, var(--foreground)) 1px, transparent 1px)',
          backgroundSize: `${gridPitch}px ${gridPitch}px`,
          backgroundPosition: `${viewport.tx}px ${viewport.ty}px`,
        }}
      />

      {/*
        A zero-sized origin, not a sized world. Its only job is to carry the
        viewport transform: every Table positions itself absolutely against it,
        including at negative coordinates, and the container's `overflow-hidden`
        does the clipping. Out of flow on purpose - in normal flow a sized world
        would set the container's min-content size, so `flex-1` could not shrink
        it and the whole page would grow to match.
      */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 0,
          height: 0,
          transform: `translate(${viewport.tx}px, ${viewport.ty}px) scale(${viewport.scale})`,
          transformOrigin: '0 0',
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) onOpenTable(null);
        }}
      >
        {tables.map((view) => (
          <TableNode
            key={view.table.id}
            view={view}
            isOpen={openTableId === view.table.id}
            scale={viewport.scale}
            onOpen={() =>
              onOpenTable(openTableId === view.table.id ? null : view.table.id)
            }
          />
        ))}
      </div>

      <CanvasZoomControls
        scale={viewport.scale}
        canZoomIn={viewport.scale < MAX_SCALE - ZOOM_EPSILON}
        canZoomOut={viewport.scale > MIN_SCALE + ZOOM_EPSILON}
        onZoomIn={() => stepZoom(1)}
        onZoomOut={() => stepZoom(-1)}
        onFit={() => fitView()}
      />

      {children}
    </div>
  );
}
