/**
 * The guest list's selection: a set of Guest Record ids, independent of search,
 * filters and sort. The Owner can search one name, tick it, search another and
 * tick that too, and act on both. Every function here returns a new set - the
 * selection is React state.
 */

export type Selection = ReadonlySet<string>;
export type HeaderState = 'all' | 'some' | 'none';

export function toggleOne(selected: Selection, id: string): Set<string> {
  const next = new Set(selected);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

/**
 * Shift-click: sets every row from the anchor to the target (inclusive, in the
 * order shown) to `checked`. An anchor that has scrolled out of the filter
 * degrades to a plain click on the target.
 */
export function selectRange(
  selected: Selection,
  visibleIds: readonly string[],
  anchorId: string,
  targetId: string,
  checked: boolean,
): Set<string> {
  const next = new Set(selected);
  const to = visibleIds.indexOf(targetId);
  if (to === -1) return next;
  const from = visibleIds.indexOf(anchorId);
  const [start, end] =
    from === -1 ? [to, to] : [Math.min(from, to), Math.max(from, to)];
  for (const id of visibleIds.slice(start, end + 1)) {
    if (checked) next.add(id);
    else next.delete(id);
  }
  return next;
}

/** The header checkbox speaks for the rows the current filter shows, not the whole set. */
export function headerState(
  selected: Selection,
  visibleIds: readonly string[],
): HeaderState {
  if (visibleIds.length === 0) return 'none';
  const picked = visibleIds.filter((id) => selected.has(id)).length;
  if (picked === 0) return 'none';
  return picked === visibleIds.length ? 'all' : 'some';
}

/**
 * Selects every row matching the filter, or - when they all already are -
 * clears just those rows. Selections hidden by the filter are never touched.
 */
export function toggleAllVisible(
  selected: Selection,
  visibleIds: readonly string[],
): Set<string> {
  const next = new Set(selected);
  const clear = headerState(selected, visibleIds) === 'all';
  for (const id of visibleIds) {
    if (clear) next.delete(id);
    else next.add(id);
  }
  return next;
}

/** Selected records the current filter hides - "12 selected · 2 not shown". */
export function hiddenCount(
  selected: Selection,
  visibleIds: readonly string[],
): number {
  const visible = new Set(visibleIds);
  let hidden = 0;
  for (const id of selected) if (!visible.has(id)) hidden++;
  return hidden;
}

/** Drops ids that are no longer in the list; returns the same set when nothing changed. */
export function pruneSelection<T extends Selection>(
  selected: T,
  existingIds: readonly string[],
): T | Set<string> {
  const existing = new Set(existingIds);
  for (const id of selected) {
    if (!existing.has(id))
      return new Set([...selected].filter((kept) => existing.has(kept)));
  }
  return selected;
}
