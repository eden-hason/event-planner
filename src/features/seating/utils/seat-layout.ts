import type { TableRotation, TableShape } from '../schemas';

/**
 * Geometry for the seat diagram.
 *
 * ADR-0009 makes `shape` load-bearing: a Table is drawn top-down with one seat
 * per unit of capacity, so a planner reads occupancy off the picture before
 * reading any number. A round table gets a ring of seats; a square or long
 * table gets seats walked evenly around its perimeter.
 *
 * These constants come from the approved design and are deliberately verbatim -
 * they are what make a 10-seat round table look like a 10-seat round table.
 */
const PAD = 12; // breathing room outside the seats
const RING = 17; // distance from the table edge out to the seat centres

export const SEAT_RADIUS = 7.5;
export const SEAT_STROKE_WIDTH = 1.25;
export const TABLE_STROKE_WIDTH = 1.5;
export const TABLE_CORNER_RADIUS = 10;

export type SeatFill = 'confirmed' | 'pending' | 'empty';

export interface SeatPoint {
  x: number;
  y: number;
  fill: SeatFill;
}

export type TableTop =
  | { kind: 'circle'; cx: number; cy: number; r: number }
  | { kind: 'rect'; x: number; y: number; width: number; height: number };

export interface SeatLayout {
  /** Intrinsic diagram size, also the SVG viewBox. */
  width: number;
  height: number;
  viewBox: string;
  top: TableTop;
  seats: SeatPoint[];
}

/**
 * Seats fill confirmed first, then provisional, then empty, so the ring reads
 * as one continuous arc of committed places rather than a scatter. The two
 * head counts are validated together against capacity (ADR-0008) but shown
 * apart, which is exactly how they are drawn.
 */
function fillFor(index: number, confirmedHeads: number, pendingHeads: number): SeatFill {
  if (index < confirmedHeads) return 'confirmed';
  if (index < confirmedHeads + pendingHeads) return 'pending';
  return 'empty';
}

export function seatLayout(
  shape: TableShape,
  capacity: number,
  confirmedHeads = 0,
  pendingHeads = 0,
): SeatLayout {
  const seats: Array<{ x: number; y: number }> = [];

  if (shape === 'round') {
    const ringRadius = Math.max(44, 22 + capacity * 2.6);
    const centre = ringRadius + PAD;
    const size = 2 * centre;

    for (let i = 0; i < capacity; i += 1) {
      // Start at twelve o'clock so the first seat is where a planner looks first.
      const angle = ((-90 + (360 * i) / capacity) * Math.PI) / 180;
      seats.push({
        x: centre + ringRadius * Math.cos(angle),
        y: centre + ringRadius * Math.sin(angle),
      });
    }

    return {
      width: size,
      height: size,
      viewBox: `0 0 ${size} ${size}`,
      top: { kind: 'circle', cx: centre, cy: centre, r: ringRadius - RING },
      seats: seats.map((p, i) => ({ ...p, fill: fillFor(i, confirmedHeads, pendingHeads) })),
    };
  }

  // A square grows in both directions as it gains seats; a long table grows
  // only along its length, which is what makes it read as a long table.
  const innerWidth =
    shape === 'square'
      ? Math.max(70, Math.ceil(capacity / 4) * 27)
      : Math.max(112, Math.max(2, Math.ceil((capacity - 2) / 2)) * 27);
  const innerHeight = shape === 'square' ? innerWidth : 62;

  const width = innerWidth + 2 * (PAD + RING);
  const height = innerHeight + 2 * (PAD + RING);

  // Seats sit on a box RING away from the table top, distributed by arc length
  // so corners never bunch up.
  const boxX = PAD;
  const boxY = PAD;
  const boxWidth = innerWidth + 2 * RING;
  const boxHeight = innerHeight + 2 * RING;
  const perimeter = 2 * (boxWidth + boxHeight);
  const step = perimeter / capacity;

  for (let i = 0; i < capacity; i += 1) {
    const distance = (i + 0.5) * step;
    if (distance < boxWidth) {
      seats.push({ x: boxX + distance, y: boxY });
    } else if (distance < boxWidth + boxHeight) {
      seats.push({ x: boxX + boxWidth, y: boxY + (distance - boxWidth) });
    } else if (distance < 2 * boxWidth + boxHeight) {
      seats.push({
        x: boxX + boxWidth - (distance - boxWidth - boxHeight),
        y: boxY + boxHeight,
      });
    } else {
      seats.push({
        x: boxX,
        y: boxY + boxHeight - (distance - 2 * boxWidth - boxHeight),
      });
    }
  }

  return {
    width,
    height,
    viewBox: `0 0 ${width} ${height}`,
    top: {
      kind: 'rect',
      x: PAD + RING,
      y: PAD + RING,
      width: innerWidth,
      height: innerHeight,
    },
    seats: seats.map((p, i) => ({ ...p, fill: fillFor(i, confirmedHeads, pendingHeads) })),
  };
}

/**
 * Footprint of a Table on the canvas, used to place new Tables without
 * overlapping them and to frame the plan on fit. Derived from the same geometry
 * that draws them, so the two can never drift apart the way the old hard-coded
 * boxes did.
 *
 * A quarter turn swaps the two dimensions. This is the reason rotation is
 * restricted to quarter turns at all: at any other angle the footprint stops
 * being the drawing's own box and the placement maths would need a second,
 * separate model of the same table.
 */
export function tableFootprint(
  shape: TableShape,
  capacity: number,
  rotation: TableRotation = 0,
) {
  const { width, height } = seatLayout(shape, capacity);
  return isQuarterTurn(rotation) ? { width: height, height: width } : { width, height };
}

function isQuarterTurn(rotation: TableRotation) {
  return rotation === 90 || rotation === 270;
}

/**
 * How to draw a rotated diagram.
 *
 * The rotation happens inside the SVG rather than as a CSS transform on the
 * element: a CSS rotate leaves the layout box unrotated, so a quarter-turned
 * long table would still reserve its original width and sit crooked under its
 * own label. Spinning the content about the diagram's centre and widening the
 * viewBox to the rotated bounds keeps the element's box and the drawing in
 * agreement, and it costs one attribute instead of a second layout model.
 */
export function rotatedFrame(layout: SeatLayout, rotation: TableRotation) {
  const { width, height } = layout;
  const boxWidth = isQuarterTurn(rotation) ? height : width;
  const boxHeight = isQuarterTurn(rotation) ? width : height;

  return {
    // Re-centred on the same point the content spins around, so the rotated
    // drawing lands inside it whichever way it turned.
    viewBox: `${(width - boxWidth) / 2} ${(height - boxHeight) / 2} ${boxWidth} ${boxHeight}`,
    transform: `rotate(${rotation} ${width / 2} ${height / 2})`,
  };
}
