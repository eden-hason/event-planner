import type { GroupSide } from '@/features/guests/schemas';
import type { RsvpStatus } from './rsvp-presentation';
import {
  NO_PHONE_ISSUE,
  parseGuestIssue,
  type GuestIssue,
} from './guest-health';

export type GuestSortKey =
  | 'name_asc'
  | 'name_desc'
  | 'created_asc'
  | 'created_desc'
  | 'rsvp'
  | 'amount_desc';

/**
 * The guest list's view - search, filters and sort - as it lives in the URL, so
 * a refresh, the back button, opening a guest, and a link from Home all land on
 * the same list. The selection is deliberately not part of it.
 */
export type GuestListParams = {
  q: string;
  /** One status at a time: the status chips are a segmented control. */
  status: RsvpStatus | null;
  groups: string[];
  side: GroupSide | null;
  noPhone: boolean;
  sort: GuestSortKey;
  issue: GuestIssue | null;
};

export const DEFAULT_GUEST_LIST_PARAMS: GuestListParams = {
  q: '',
  status: null,
  groups: [],
  side: null,
  noPhone: false,
  sort: 'created_asc',
  issue: null,
};

const STATUSES: readonly RsvpStatus[] = ['confirmed', 'pending', 'declined'];
/** The status filter's options, in order - `null` is "all". */
export const GUEST_STATUS_FILTERS: readonly (RsvpStatus | null)[] = [
  null,
  ...STATUSES,
];
const SIDES: readonly GroupSide[] = ['bride', 'groom'];
export const GUEST_SORT_KEYS: readonly GuestSortKey[] = [
  'created_asc',
  'created_desc',
  'name_asc',
  'name_desc',
  'rsvp',
  'amount_desc',
];

const KEYS = [
  'q',
  'status',
  'group',
  'side',
  'noPhone',
  'sort',
  'issue',
] as const;

/** An issue scope sorts by name, so likely duplicates sit side by side. */
function defaultSortFor(issue: GuestIssue | null): GuestSortKey {
  return issue ? 'name_asc' : DEFAULT_GUEST_LIST_PARAMS.sort;
}

function oneOf<T extends string>(
  options: readonly T[],
  value: string | null,
): T | null {
  return options.includes(value as T) ? (value as T) : null;
}

export function parseGuestListParams(search: URLSearchParams): GuestListParams {
  const rawIssue = search.get('issue');
  // `?issue=no-phone` from Home is the list's own no-phone filter, not a scope.
  const issue = parseGuestIssue(rawIssue);
  return {
    q: search.get('q') ?? '',
    status: oneOf(STATUSES, search.get('status')),
    groups: (search.get('group') ?? '').split(',').filter(Boolean),
    side: oneOf(SIDES, search.get('side')),
    noPhone: search.get('noPhone') === '1' || rawIssue === NO_PHONE_ISSUE,
    sort: oneOf(GUEST_SORT_KEYS, search.get('sort')) ?? defaultSortFor(issue),
    issue,
  };
}

/**
 * Writes the view into `search`, leaving every param that isn't the list's own
 * (`guest`, `tab`) alone. Defaults are left out so the plain list has a clean URL.
 */
export function writeGuestListParams(
  params: GuestListParams,
  search: URLSearchParams,
) {
  for (const key of KEYS) search.delete(key);
  if (params.q) search.set('q', params.q);
  if (params.status) search.set('status', params.status);
  if (params.groups.length > 0) search.set('group', params.groups.join(','));
  if (params.side) search.set('side', params.side);
  if (params.noPhone) search.set('noPhone', '1');
  if (params.sort !== defaultSortFor(params.issue))
    search.set('sort', params.sort);
  if (params.issue) search.set('issue', params.issue);
}

/** What the Filters button's badge counts: everything but status and search. */
export function activeFilterCount(params: GuestListParams): number {
  return (
    params.groups.length + (params.side ? 1 : 0) + (params.noPhone ? 1 : 0)
  );
}
