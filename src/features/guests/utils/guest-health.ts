/**
 * Guest List Health Check (see CONTEXT.md): a read-only scan for likely data
 * problems. Shared by Home, which counts them, and the guest list, which
 * filters to them through `?issue=` (read in `useGuestFilters`).
 *
 * Duplicates are by name only. Phones cannot collide: the database holds one
 * Guest Record per phone per event (guests_event_id_phone_number_key), so the
 * duplicates that can exist are the same person entered twice without a phone
 * or under two numbers.
 */

/**
 * The `?issue=` values that scope the guest list. `no-phone` is not one of
 * them: it hands off to the list's own no-phone filter.
 */
const GUEST_ISSUES = ['duplicates', 'all'] as const;
export type GuestIssue = (typeof GUEST_ISSUES)[number];
export const NO_PHONE_ISSUE = 'no-phone';

export function parseGuestIssue(value: string | null | undefined): GuestIssue | null {
  return GUEST_ISSUES.includes(value as GuestIssue) ? (value as GuestIssue) : null;
}

/** The comparison key for "same name": case, spacing and punctuation ignored. */
function normalizeGuestName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[׳״'"`.,\-_()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export type GuestIssues = {
  duplicateIds: Set<string>;
  noPhoneIds: Set<string>;
};

export function findGuestIssues(
  guests: ReadonlyArray<{ id: string; name: string; phone?: string | null }>,
): GuestIssues {
  const byName = new Map<string, string[]>();
  const noPhoneIds = new Set<string>();

  for (const guest of guests) {
    if (!guest.phone) noPhoneIds.add(guest.id);
    const key = normalizeGuestName(guest.name);
    if (!key) continue;
    const ids = byName.get(key);
    if (ids) ids.push(guest.id);
    else byName.set(key, [guest.id]);
  }

  const duplicateIds = new Set<string>();
  for (const ids of byName.values()) {
    if (ids.length > 1) ids.forEach((id) => duplicateIds.add(id));
  }

  return { duplicateIds, noPhoneIds };
}

/** The guests `issue` flags: likely duplicates, or those plus Guest Records with no phone. */
export function scopeToGuestIssue<T extends { id: string; name: string; phone?: string | null }>(
  guests: T[],
  issue: GuestIssue,
): T[] {
  const { duplicateIds, noPhoneIds } = findGuestIssues(guests);
  return guests.filter(
    (guest) => duplicateIds.has(guest.id) || (issue === 'all' && noPhoneIds.has(guest.id)),
  );
}
