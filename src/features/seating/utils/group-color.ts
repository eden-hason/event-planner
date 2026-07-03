export interface SeatColor {
  bg: string;
  fg: string;
}

const PALETTE: SeatColor[] = [
  { bg: '#f97316', fg: '#fff' }, // orange
  { bg: '#3b82f6', fg: '#fff' }, // blue
  { bg: '#f59e0b', fg: '#fff' }, // amber
  { bg: '#ec4899', fg: '#fff' }, // pink
  { bg: '#14b8a6', fg: '#fff' }, // teal
  { bg: '#8b5cf6', fg: '#fff' }, // purple
  { bg: '#22c55e', fg: '#fff' }, // green
  { bg: '#ef4444', fg: '#fff' }, // red
];

const NEUTRAL: SeatColor = { bg: '#94a3b8', fg: '#fff' };

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h + id.charCodeAt(i)) % PALETTE.length;
  }
  return h;
}

export function groupColor(groupId: string | null | undefined): SeatColor {
  if (!groupId) return NEUTRAL;
  return PALETTE[hashId(groupId)];
}
