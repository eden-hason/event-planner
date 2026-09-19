import type { EventApp } from '@/features/events/schemas';
import type {
  FallbackActionKey,
  FeaturedActionFacts,
  FeaturedActionKey,
  RankedActionKey,
} from '../types';

export const FEATURED_ACTION_SLOTS = 4;

/** Below this many Guest Records a hand-built list has no drift worth flagging. */
export const HEALTH_CHECK_MIN_RECORDS = 20;

/** Tier 1, in priority order: every unfinished setup step outranks everything else. */
const SETUP_TIER: readonly RankedActionKey[] = [
  'details',
  'addGuests',
  'groups',
  'invitationImage',
  'collaborator',
];

/** The tiers after setup, in priority order within each (home-page brief section 6). */
const LATER_TIERS: ReadonlyArray<readonly RankedActionKey[]> = [
  // Urgent ongoing
  ['health'],
  // Discovery
  ['test', 'seating', 'gifting', 'preview', 'budget'],
];

const FALLBACK: readonly FallbackActionKey[] = ['addGuest', 'ai', 'viewList'];

const ELIGIBLE: Record<RankedActionKey, (f: FeaturedActionFacts) => boolean> = {
  details: (f) => !f.detailsComplete,
  addGuests: (f) => f.guestRecords === 0,
  groups: (f) => f.guestRecords > 0 && f.groupCount === 0,
  invitationImage: (f) => !f.hasInvitationImage,
  collaborator: (f) => f.collaboratorCount <= 1,
  health: (f) =>
    f.guestRecords >= HEALTH_CHECK_MIN_RECORDS &&
    (f.duplicateRecords > 0 || f.noPhoneRecords > 0),
  test: (f) => f.canReceiveTestMessage,
  seating: (f) => f.confirmedHeads > 0 && f.tableCount === 0,
  gifting: (f) => !f.giftingConfigured,
  preview: (f) => f.hasChosenTemplate && f.hasPreviewToken,
  budget: (f) => f.expenseCount === 0,
};

/**
 * The event details an Owner is asked to finish: the main time and a venue. A
 * wedding's main time is the ceremony; the other types have no ceremony input,
 * so theirs is the reception.
 */
export function isDetailsComplete(event: EventApp): boolean {
  const time =
    event.eventType === 'wedding' ? event.ceremonyTime : event.receptionTime;
  return Boolean(time && event.location?.name);
}

/**
 * Picks the Featured Actions for this render: every eligible setup step, then
 * the highest-priority eligible action from each later tier, then the rest of
 * those in tier order, then the fallback trio. Computed, never stored, never
 * dismissed - an action leaves only when its rule turns false (ADR 0010).
 */
export function rankFeaturedActions(facts: FeaturedActionFacts): FeaturedActionKey[] {
  const isEligible = (key: RankedActionKey) => ELIGIBLE[key](facts);
  const later = LATER_TIERS.map((keys) => keys.filter(isEligible));

  const picked: FeaturedActionKey[] = [
    ...SETUP_TIER.filter(isEligible),
    ...later.flatMap((keys) => keys.slice(0, 1)),
    ...later.flatMap((keys) => keys.slice(1)),
  ].slice(0, FEATURED_ACTION_SLOTS);

  for (const key of FALLBACK) {
    if (picked.length >= FEATURED_ACTION_SLOTS) break;
    picked.push(key);
  }

  return picked;
}
