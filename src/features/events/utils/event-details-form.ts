import type {
  EventApp,
  EventDetailsFormValues,
  EventHostDetails,
} from '../schemas';

/**
 * The meals offered when the Owner has never narrowed the list. Everything is
 * on the table until they say otherwise, which is what the confirmation
 * conversation assumed before the list was configurable.
 */
export const DEFAULT_MEAL_CHOICES: readonly string[] = [
  'vegetarian',
  'vegan',
  'gluten_free',
  'strictly_kosher',
];

export function buildDefaultValues(event: EventApp): EventDetailsFormValues {
  const hostDetails = event.hostDetails as EventHostDetails | undefined;
  const person = (role: 'bride' | 'groom' | 'child') => ({
    name: hostDetails?.[role]?.name ?? '',
    parents: hostDetails?.[role]?.parents ?? '',
  });

  return {
    id: event.id,
    eventDate: event.eventDate ?? '',
    receptionTime: event.receptionTime ?? '',
    ceremonyTime: event.ceremonyTime ?? '',
    location: event.location ?? null,
    invitations: { imageUrl: event.invitations?.imageUrl ?? '' },
    hostDetails: {
      bride: person('bride'),
      groom: person('groom'),
      child: person('child'),
    },
    guestExperience: {
      dietaryOptions: event.guestExperience?.dietaryOptions ?? false,
      dietaryTypes:
        event.guestExperience?.dietaryTypes ?? [...DEFAULT_MEAL_CHOICES],
      lockGuestCount: event.guestExperience?.lockGuestCount ?? false,
      sendTableNumbers: event.guestExperience?.sendTableNumbers ?? false,
    },
  };
}

/**
 * One named thing the save bar can count and, when it is the only one, name.
 *
 * These are the Owner's units of change, not the storage's: the two host
 * columns live in one `host_details` JSONB blob, but "the bride's name" and
 * "the groom's parents" are two separate edits to a person reading the bar.
 */
export type ChangeKey =
  | 'eventDate'
  | 'receptionTime'
  | 'ceremonyTime'
  | 'location'
  | 'invitation'
  | 'brideName'
  | 'brideParents'
  | 'groomName'
  | 'groomParents'
  | 'childName'
  | 'childParents'
  | 'specialMeal'
  | 'meals'
  | 'lockGuestCount'
  | 'sendTableNumbers';

/** In the order the page renders the fields, so the bar counts top to bottom. */
const CHANGE_PATHS: ReadonlyArray<readonly [ChangeKey, readonly string[]]> = [
  ['brideName', ['hostDetails', 'bride', 'name']],
  ['brideParents', ['hostDetails', 'bride', 'parents']],
  ['groomName', ['hostDetails', 'groom', 'name']],
  ['groomParents', ['hostDetails', 'groom', 'parents']],
  ['childName', ['hostDetails', 'child', 'name']],
  ['childParents', ['hostDetails', 'child', 'parents']],
  ['eventDate', ['eventDate']],
  ['receptionTime', ['receptionTime']],
  ['ceremonyTime', ['ceremonyTime']],
  ['location', ['location']],
  ['invitation', ['invitations']],
  ['specialMeal', ['guestExperience', 'dietaryOptions']],
  ['meals', ['guestExperience', 'dietaryTypes']],
  ['lockGuestCount', ['guestExperience', 'lockGuestCount']],
  ['sendTableNumbers', ['guestExperience', 'sendTableNumbers']],
];

/**
 * React Hook Form marks a dirty leaf `true` and mirrors the value's own shape
 * above it, so an object or array node is dirty when anything under it is. A
 * cleared array can also come back as a sparse array of `undefined` holes.
 */
function isDirtyNode(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(isDirtyNode);
  if (value && typeof value === 'object') {
    return Object.values(value).some(isDirtyNode);
  }
  return value === true;
}

function isDirtyAt(dirtyFields: unknown, path: readonly string[]): boolean {
  let node: unknown = dirtyFields;
  for (const segment of path) {
    if (!node || typeof node !== 'object') return false;
    node = (node as Record<string, unknown>)[segment];
  }
  return isDirtyNode(node);
}

/**
 * What the Owner has changed and not yet saved, as the save bar names it.
 *
 * The host role that the event type does not show is skipped even if it somehow
 * went dirty, so a mitzva never reports a change to "the bride's name" - that
 * half of `host_details` is carried by the form but never rendered.
 */
export function changedKeys(
  dirtyFields: unknown,
  options: { couple: boolean; hasCeremony: boolean },
): ChangeKey[] {
  const skipped = new Set<ChangeKey>(
    options.couple
      ? ['childName', 'childParents']
      : ['brideName', 'brideParents', 'groomName', 'groomParents'],
  );
  if (!options.hasCeremony) skipped.add('ceremonyTime');

  return CHANGE_PATHS.filter(
    ([key, path]) => !skipped.has(key) && isDirtyAt(dirtyFields, path),
  ).map(([key]) => key);
}

/** Which `updateEventDetails` field each change is carried by. */
const CHANGE_FIELDS: Record<ChangeKey, string> = {
  eventDate: 'eventDate',
  receptionTime: 'receptionTime',
  ceremonyTime: 'ceremonyTime',
  location: 'location',
  invitation: 'invitations',
  brideName: 'hostDetails',
  brideParents: 'hostDetails',
  groomName: 'hostDetails',
  groomParents: 'hostDetails',
  childName: 'hostDetails',
  childParents: 'hostDetails',
  specialMeal: 'guestExperience',
  meals: 'guestExperience',
  lockGuestCount: 'guestExperience',
  sendTableNumbers: 'guestExperience',
};

/**
 * The FormData entries for one save: only the fields the Owner actually
 * changed.
 *
 * `updateEventDetails` writes a column only when its key is present, so sending
 * the untouched ones would be a no-op at best - and at worst would rewrite a
 * JSONB blob another writer (the back office, the onboarding, a collaborator)
 * changed since this page loaded. `host_details` and `guests_experience` are
 * single columns, so they still go whole; a scalar goes on its own.
 */
export function buildUpdateFields(
  values: EventDetailsFormValues,
  keys: readonly ChangeKey[],
  options: { couple: boolean },
): Record<string, string> {
  const fields = new Set(keys.map((key) => CHANGE_FIELDS[key]));
  const entries: Record<string, string> = { id: values.id };

  if (fields.has('eventDate')) entries.eventDate = values.eventDate;
  if (fields.has('receptionTime')) entries.receptionTime = values.receptionTime;
  if (fields.has('ceremonyTime')) entries.ceremonyTime = values.ceremonyTime;

  if (fields.has('location')) {
    entries.location = JSON.stringify(values.location ?? { name: '' });
  }

  if (fields.has('invitations')) {
    entries.invitations = JSON.stringify(values.invitations);
  }

  if (fields.has('hostDetails')) {
    // Only the roles this event type has: writing an empty `child` onto a
    // wedding would put a person on the row who does not exist.
    entries.hostDetails = JSON.stringify(
      options.couple
        ? {
          bride: values.hostDetails.bride,
          groom: values.hostDetails.groom,
        }
        : { child: values.hostDetails.child },
    );
  }

  if (fields.has('guestExperience')) {
    entries.guestExperience = JSON.stringify(values.guestExperience);
  }

  return entries;
}
