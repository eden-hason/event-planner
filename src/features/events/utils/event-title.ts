import { isCoupleEvent, type EventTypeKey } from '../schemas';

/**
 * Names as the couple typed them on the names screen.
 *
 * A couple event uses `bride`/`groom`; a mitzva uses `child`. Passing the wrong
 * pair for the type is not an error - the unused ones are ignored - because the
 * names screen keeps whatever was typed before the type was changed.
 */
export type EventHostNames = {
  brideName?: string;
  groomName?: string;
  childName?: string;
};

/**
 * One frame per type, always ending in "של".
 *
 * There is no separate nameless phrasing: before the names are given the title
 * is just the frame, left open for the name that is about to land in it, which
 * is what makes the card read as filling in rather than being replaced. The ה
 * of the mitzvas sits on מצווה rather than at the front.
 */
const HE = {
  wedding: { prefix: 'החתונה של' },
  henna: { prefix: 'החינה של' },
  bar_mitzva: { prefix: 'בר המצווה של' },
  bat_mitzva: { prefix: 'בת המצווה של' },
} as const;

const EN = {
  wedding: { prefix: 'The Wedding of', fallback: 'My Wedding' },
  henna: { prefix: 'The Henna of', fallback: 'My Henna' },
  bar_mitzva: { label: 'Bar Mitzva' },
  bat_mitzva: { label: 'Bat Mitzva' },
} as const;

/**
 * The hosts a type is named after, in the order they are read out.
 *
 * Empty until the names screen is answered, which is what leaves a Draft
 * Event's title as the bare frame rather than a half-filled sentence.
 */
function resolveHosts(
  eventType: EventTypeKey,
  names: EventHostNames,
): string[] {
  const trim = (v?: string) => v?.trim() || undefined;

  return (
    isCoupleEvent(eventType)
      ? [trim(names.brideName), trim(names.groomName)]
      : [trim(names.childName)]
  ).filter((name): name is string => !!name);
}

/**
 * The Hebrew title split into the frame and the names that fill it.
 *
 * `buildEventTitle` joins the two into one sentence; a surface that sets the
 * frame apart typographically - the reminder page prints it as an eyebrow
 * above the names - needs the halves on their own. Hebrew only, because the
 * English phrasings do not all put the frame first.
 */
export function buildEventTitleParts(
  eventType: EventTypeKey,
  names: EventHostNames,
): { prefix: string; hosts: string[] } {
  return {
    prefix: HE[eventType].prefix,
    hosts: resolveHosts(eventType, names),
  };
}

/**
 * Builds the event title from the host names.
 *
 * The title is generated, never typed: the names screen is the only place these
 * names are captured, and the couple never sees an editable title field. It is
 * regenerated on every names edit, so it always agrees with `host_details`.
 *
 * Always returns something: with no names yet - the state a Draft Event is in
 * until the names screen is answered - Hebrew gives back the open "X של" frame
 * and English its own nameless phrasing.
 */
export function buildEventTitle(
  eventType: EventTypeKey,
  names: EventHostNames,
  locale: string,
): string {
  const hosts = resolveHosts(eventType, names);

  if (locale === 'he') {
    const { prefix } = HE[eventType];
    // No names yet leaves the bare frame - "החתונה של" - rather than a
    // different sentence, so the name simply arrives at the end of it.
    return hosts.length ? `${prefix} ${hosts.join(' ו')}` : prefix;
  }

  if (isCoupleEvent(eventType)) {
    const copy = EN[eventType as 'wedding' | 'henna'];
    return hosts.length
      ? `${copy.prefix} ${hosts.join(' and ')}`
      : copy.fallback;
  }

  const copy = EN[eventType as 'bar_mitzva' | 'bat_mitzva'];
  return hosts.length ? `${hosts[0]}'s ${copy.label}` : copy.label;
}

/**
 * Shapes the names into the `host_details` jsonb the rest of the app reads.
 */
export function buildHostDetails(
  eventType: EventTypeKey,
  names: EventHostNames,
): Record<string, unknown> {
  const trim = (v?: string) => v?.trim() || undefined;

  if (isCoupleEvent(eventType)) {
    const bride = trim(names.brideName);
    const groom = trim(names.groomName);
    return {
      bride: bride ? { name: bride } : undefined,
      groom: groom ? { name: groom } : undefined,
    };
  }

  const child = trim(names.childName);
  return { child: child ? { name: child } : undefined };
}

/**
 * Pulls the event type key out of a joined `event_types` relation.
 *
 * PostgREST types an embedded to-one relation as an array, so the shape varies
 * with how the row was selected; this reads either form.
 */
export function readEventTypeKey(relation: unknown): string | undefined {
  const row = Array.isArray(relation) ? relation[0] : relation;
  if (!row || typeof row !== 'object') return undefined;
  const key = (row as { key?: unknown }).key;
  return typeof key === 'string' ? key : undefined;
}

/**
 * Reads the names back out of `host_details`, so a resumed onboarding can
 * repopulate the names screen with whatever was already answered.
 */
export function readHostNames(
  hostDetails: Record<string, unknown> | undefined,
): EventHostNames {
  if (!hostDetails) return {};
  const nameOf = (key: string): string | undefined => {
    const entry = hostDetails[key];
    if (!entry || typeof entry !== 'object') return undefined;
    const name = (entry as { name?: unknown }).name;
    return typeof name === 'string' && name.trim() ? name : undefined;
  };

  return {
    brideName: nameOf('bride'),
    groomName: nameOf('groom'),
    childName: nameOf('child'),
  };
}
