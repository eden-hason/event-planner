import { GuestWithGroupApp, GroupSide } from '@/features/guests/schemas';
import type { GuestSortKey } from './guest-list-params';

const RSVP_ORDER: Record<string, number> = {
  confirmed: 0,
  pending: 1,
  declined: 2,
};

export interface GuestFilterParams {
  searchTerm: string;
  groupIds: string[];
  statuses: string[];
  sides: GroupSide[];
  noPhoneOnly: boolean;
  sortKey: GuestSortKey;
}

/** The filter half of `filterAndSortGuests` - enough when only the count matters. */
export function filterGuests(
  guests: GuestWithGroupApp[],
  { searchTerm, groupIds, statuses, sides, noPhoneOnly }: Omit<GuestFilterParams, 'sortKey'>,
): GuestWithGroupApp[] {
  const search = searchTerm.trim().toLowerCase();

  return guests.filter((guest) => {
    // Side filter
    if (sides.length > 0 && (!guest.side || !sides.includes(guest.side))) {
      return false;
    }
    // No-phone filter
    if (noPhoneOnly && guest.phone) {
      return false;
    }
    // Group filter
    if (groupIds.length > 0 && (!guest.group || !groupIds.includes(guest.group.id))) {
      return false;
    }
    // Status filter
    if (statuses.length > 0 && !statuses.includes(guest.rsvpStatus)) {
      return false;
    }
    // Search across name / phone / group name / host note
    if (search) {
      const matches =
        guest.name.toLowerCase().includes(search) ||
        (guest.phone?.toLowerCase().includes(search) ?? false) ||
        (guest.group?.name.toLowerCase().includes(search) ?? false) ||
        (guest.notes?.toLowerCase().includes(search) ?? false);
      if (!matches) return false;
    }
    return true;
  });
}

/** Pure filter + sort for the guest list, shared by the desktop table and the phone cards. */
export function filterAndSortGuests(
  guests: GuestWithGroupApp[],
  params: GuestFilterParams,
): GuestWithGroupApp[] {
  const { sortKey } = params;
  return [...filterGuests(guests, params)].sort((a, b) => {
    let primary = 0;
    switch (sortKey) {
      case 'name_asc':
        primary = a.name.localeCompare(b.name);
        break;
      case 'name_desc':
        primary = b.name.localeCompare(a.name);
        break;
      case 'created_asc':
        primary = 0; // DB already returns in created_at ASC, id ASC order
        break;
      case 'created_desc':
        primary = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        break;
      case 'rsvp':
        primary = (RSVP_ORDER[a.rsvpStatus] ?? 99) - (RSVP_ORDER[b.rsvpStatus] ?? 99);
        break;
      case 'amount_desc':
        primary = (b.amount ?? 0) - (a.amount ?? 0);
        break;
    }
    return primary !== 0 ? primary : a.id.localeCompare(b.id);
  });
}
