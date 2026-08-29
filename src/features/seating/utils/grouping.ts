import type { GuestWithGroupApp } from '@/features/guests';
import { headCount } from './occupancy';

/** Bucket for records that belong to no group. Always sorted last. */
export const UNGROUPED = '__ungrouped__';

export interface GuestGroupSection {
  id: string;
  /** Null for the ungrouped bucket, so the caller supplies the localized name. */
  name: string | null;
  guests: GuestWithGroupApp[];
  heads: number;
  pendingRecords: number;
}

/**
 * Split records into their groups, in the Event's own group order.
 *
 * Order comes from the caller rather than from the records themselves: the
 * Guest Directory already has a canonical group order, and re-deriving one here
 * (alphabetical, or first-seen) would give the same guests a different shape on
 * each surface. Empty groups are dropped - this lists guests, not groups.
 */
export function groupGuests(
  guests: GuestWithGroupApp[],
  order: Array<{ id: string; name: string }>,
): GuestGroupSection[] {
  const byGroup = new Map<string, GuestWithGroupApp[]>();

  for (const guest of guests) {
    const key = guest.group?.id ?? UNGROUPED;
    const bucket = byGroup.get(key);
    if (bucket) bucket.push(guest);
    else byGroup.set(key, [guest]);
  }

  const sections: GuestGroupSection[] = [];
  const push = (id: string, name: string | null) => {
    const members = byGroup.get(id);
    if (!members || members.length === 0) return;
    sections.push({
      id,
      name,
      guests: members,
      heads: headCount(members),
      pendingRecords: members.filter((guest) => guest.rsvpStatus === 'pending')
        .length,
    });
  };

  for (const group of order) {
    push(
      group.id,
      guests.find((guest) => guest.group?.id === group.id)?.group?.name ?? null,
    );
  }

  // A record can carry a group the order does not list - a group added since
  // the page loaded, say. Better to show it than to silently drop the guest.
  for (const key of byGroup.keys()) {
    if (key === UNGROUPED || sections.some((section) => section.id === key))
      continue;
    push(key, byGroup.get(key)?.[0]?.group?.name ?? null);
  }

  push(UNGROUPED, null);

  return sections;
}
