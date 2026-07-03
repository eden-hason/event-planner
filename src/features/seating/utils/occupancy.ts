import type { GuestWithGroupApp } from '@/features/guests/schemas';
import type { TableOccupancy } from '../types';

export function tableOccupancy(
  capacity: number,
  guests: GuestWithGroupApp[],
): TableOccupancy {
  const seatedHeadCount = guests.reduce((sum, g) => sum + g.amount, 0);
  return {
    seatedHeadCount,
    capacity,
    isOverCapacity: seatedHeadCount > capacity,
  };
}

export function rsvpSortKey(status: GuestWithGroupApp['rsvpStatus']): number {
  if (status === 'confirmed') return 0;
  if (status === 'pending') return 1;
  return 2;
}
