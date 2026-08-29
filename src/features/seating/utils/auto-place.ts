import type { TableRotation, TableShape } from '../schemas';
import { tableFootprint } from './seat-layout';
import { SNAP_GRID } from './snap';

/**
 * Where to drop a newly created Table on the canvas.
 *
 * Position is an arrangement aid and nothing more (ADR-0005): it never affects
 * capacity, validity, or completion. All this needs to do is avoid dropping a
 * new Table on top of an existing one, so the planner has something to drag
 * rather than a pile to untangle. Footprints come from the same geometry that
 * draws the seat diagram, so the two cannot drift apart.
 */

const GAP = 32;
const COLUMNS = 5;
const ORIGIN = 24;

export interface PlacedBox {
  positionX: number;
  positionY: number;
  shape: TableShape;
  capacity: number;
  /**
   * A quarter turn swaps a Table's width and height, so the footprint used to
   * keep new Tables clear of it has to be measured the way it is actually drawn.
   * New and batch-created Tables start upright, so this defaults to 0.
   */
  rotation?: TableRotation;
}

function overlaps(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return (
    a.x < b.x + b.width + GAP &&
    a.x + a.width + GAP > b.x &&
    a.y < b.y + b.height + GAP &&
    a.y + a.height + GAP > b.y
  );
}

/**
 * Scans a coarse grid and returns the first cell whose footprint touches
 * nothing. The grid step is generous enough that a 24-seat round table and a
 * 2-seat one still land in tidy columns.
 */
export function nextFreePosition(
  existing: PlacedBox[],
  shape: TableShape,
  capacity: number,
): { positionX: number; positionY: number } {
  const footprint = tableFootprint(shape, capacity);

  const occupied = existing.map((table) => {
    const box = tableFootprint(table.shape, table.capacity, table.rotation ?? 0);
    return {
      x: table.positionX,
      y: table.positionY,
      width: box.width,
      height: box.height,
    };
  });

  // Rounded up to the snap grid so an auto-placed Table already sits where a
  // drag would leave it, and the whole column stays aligned.
  const toGrid = (value: number) => Math.ceil(value / SNAP_GRID) * SNAP_GRID;
  const stepX = toGrid(tableFootprint('round', 24).width + GAP);
  const stepY = toGrid(tableFootprint('round', 24).height + GAP);

  for (let row = 0; row < 60; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      const candidate = {
        x: ORIGIN + column * stepX,
        y: ORIGIN + row * stepY,
        width: footprint.width,
        height: footprint.height,
      };

      if (!occupied.some((box) => overlaps(candidate, box))) {
        return { positionX: candidate.x, positionY: candidate.y };
      }
    }
  }

  return { positionX: ORIGIN, positionY: ORIGIN };
}

/** Positions for a whole batch, laid out left to right in number order. */
export function batchPositions(
  existing: PlacedBox[],
  shape: TableShape,
  capacity: number,
  quantity: number,
): Array<{ positionX: number; positionY: number }> {
  const placed = [...existing];
  const positions: Array<{ positionX: number; positionY: number }> = [];

  for (let i = 0; i < quantity; i += 1) {
    const position = nextFreePosition(placed, shape, capacity);
    positions.push(position);
    placed.push({ ...position, shape, capacity });
  }

  return positions;
}
