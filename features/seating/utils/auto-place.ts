import type { TableApp } from '../schemas';

const CELL_WIDTH = 240;
const CELL_HEIGHT = 200;
const COLS = 5;
const PADDING = 16;

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

const BOX_BY_SHAPE: Record<TableApp['shape'], { width: number; height: number }> = {
  round: { width: 180, height: 180 },
  square: { width: 180, height: 180 },
  rectangle: { width: 220, height: 120 },
};

function overlaps(a: Box, b: Box): boolean {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

export function nextFreePosition(
  existing: Array<{ positionX: number; positionY: number; shape: TableApp['shape'] }>,
  shape: TableApp['shape'],
): { positionX: number; positionY: number } {
  const newBox = BOX_BY_SHAPE[shape];
  const boxes: Box[] = existing.map((t) => ({
    x: t.positionX,
    y: t.positionY,
    ...BOX_BY_SHAPE[t.shape],
  }));

  for (let row = 0; row < 50; row++) {
    for (let col = 0; col < COLS; col++) {
      const candidate: Box = {
        x: PADDING + col * CELL_WIDTH,
        y: PADDING + row * CELL_HEIGHT,
        width: newBox.width,
        height: newBox.height,
      };
      if (!boxes.some((b) => overlaps(b, candidate))) {
        return { positionX: candidate.x, positionY: candidate.y };
      }
    }
  }

  return { positionX: PADDING, positionY: PADDING };
}
