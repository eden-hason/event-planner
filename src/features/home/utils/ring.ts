export type RingSegment<K extends string> = { key: K; start: number; length: number };

/** Gap between neighbouring segments, in hundredths of the circumference. */
const RING_GAP = 1.2;

/**
 * Arcs for a segmented ring, in hundredths of the circumference (an SVG circle
 * with `pathLength="100"`). Empty parts are left out. Each arc is trimmed by a
 * small gap at its end, unless it fills the ring alone.
 */
export function ringSegments<K extends string>(
  parts: ReadonlyArray<{ key: K; n: number }>,
): RingSegment<K>[] {
  const total = parts.reduce((sum, part) => sum + part.n, 0);
  const present = parts.filter((part) => part.n > 0);
  const gap = present.length > 1 ? RING_GAP : 0;
  let start = 0;
  return present.map((part) => {
    const share = (part.n / total) * 100;
    // A sliver smaller than the gap still shows as a sliver.
    const segment = { key: part.key, start, length: Math.max(share - gap, share / 2) };
    start += share;
    return segment;
  });
}
