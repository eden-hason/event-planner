import type { GroupWithGuestsApp } from '@/features/guests/schemas';

export type GroupRsvpEntry = {
  name: string;
  confirmed: number;
  pending: number;
  declined: number;
};

export function computeGroupRsvpData(groups: GroupWithGuestsApp[]): GroupRsvpEntry[] {
  return groups.map((group) => {
    let confirmed = 0;
    let pending = 0;
    let declined = 0;

    for (const guest of group.guests) {
      const amount = guest.amount ?? 1;
      if (guest.rsvpStatus === 'confirmed') confirmed += amount;
      else if (guest.rsvpStatus === 'declined') declined += amount;
      else pending += amount;
    }

    return { name: group.name, confirmed, pending, declined };
  });
}
