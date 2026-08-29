/**
 * The canvas snaps a Table's position to a coarse grid while it is dragged.
 *
 * This is an arrangement aid and nothing more (ADR-0005): the grid carries no
 * real-world unit, adds no boundary, and does not stop two Tables overlapping.
 * All it does is let a row of Tables line up without pixel-nudging, and keep the
 * stored coordinates tidy.
 *
 * The grid is measured in world units, not screen pixels, so the lattice stays
 * fixed to the plan at every zoom level - quantizing the on-screen pixels
 * instead would shift it every time the planner zoomed.
 */
export const SNAP_GRID = 24;

/** Nearest grid line to `value`, in world units. */
export function snapToGrid(value: number): number {
  return Math.round(value / SNAP_GRID) * SNAP_GRID;
}
