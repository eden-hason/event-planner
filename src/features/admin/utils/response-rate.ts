/**
 * The share of guest records that have answered at all, yes or no:
 * (confirmed + declined) / total. Pending records are the only ones left out
 * of the numerator.
 *
 * Null, not zero, when there is no guest list: an empty list has no rate, and
 * 0% would read as a failing campaign rather than as "no list yet".
 */
export function responseRate(counts: {
  total: number;
  confirmed: number;
  declined: number;
}): number | null {
  if (counts.total <= 0) return null;
  return (counts.confirmed + counts.declined) / counts.total;
}
