/**
 * The Groups tab's numbers: how many Guest Records sit in a bride's-side group,
 * a groom's-side group, a group with no side, or no group at all, plus the
 * draft diff the assign panel shows before saving. Counts are records, not
 * seats - a record of four is one here.
 */

import type { GroupSide } from '../schemas';

export interface GroupAssignmentStats {
  bride: number;
  groom: number;
  /** In a group that has no side. */
  shared: number;
  unassigned: number;
  total: number;
  /** Whole-number share of records in any group. */
  assignedPct: number;
}

/**
 * Counted by the side of the group a record belongs to - not the record's own
 * `side` field, which is a separate concept on the Guests tab.
 */
export function groupAssignmentStats(
  guests: readonly { groupId?: string | null }[],
  groups: readonly { id: string; side: GroupSide | null }[],
): GroupAssignmentStats {
  const sideByGroupId = new Map(groups.map((g) => [g.id, g.side]));
  let bride = 0;
  let groom = 0;
  let shared = 0;
  let unassigned = 0;
  for (const guest of guests) {
    if (!guest.groupId) {
      unassigned++;
      continue;
    }
    const side = sideByGroupId.get(guest.groupId);
    if (side === 'bride') bride++;
    else if (side === 'groom') groom++;
    else shared++;
  }
  const total = guests.length;
  const assignedPct =
    total > 0 ? Math.round(((total - unassigned) / total) * 100) : 0;
  return { bride, groom, shared, unassigned, total, assignedPct };
}

/**
 * The tab as it will be once held deletes go through: those groups are gone
 * and their records read as unassigned. Unchanged inputs come back as is.
 */
export function withoutPendingDeletes<
  G extends { id: string },
  R extends { groupId?: string | null },
>(groups: G[], guests: R[], hiddenIds: ReadonlySet<string>) {
  if (hiddenIds.size === 0) return { groups, guests };
  return {
    groups: groups.filter((g) => !hiddenIds.has(g.id)),
    guests: guests.map((g) =>
      g.groupId && hiddenIds.has(g.groupId) ? { ...g, groupId: null } : g,
    ),
  };
}

/** What a membership draft changes against the saved members. */
export function draftChanges(
  saved: ReadonlySet<string>,
  draft: ReadonlySet<string>,
): { added: number; removed: number; dirty: boolean } {
  let added = 0;
  let removed = 0;
  for (const id of draft) if (!saved.has(id)) added++;
  for (const id of saved) if (!draft.has(id)) removed++;
  return { added, removed, dirty: added + removed > 0 };
}
