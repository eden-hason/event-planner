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

const HE = {
  wedding: { prefix: 'החתונה של', fallback: 'החתונה שלי' },
  henna: { prefix: 'החינה של', fallback: 'החינה שלי' },
  bar_mitzva: { label: 'בר מצווה' },
  bat_mitzva: { label: 'בת מצווה' },
} as const;

const EN = {
  wedding: { prefix: 'The Wedding of', fallback: 'My Wedding' },
  henna: { prefix: 'The Henna of', fallback: 'My Henna' },
  bar_mitzva: { label: 'Bar Mitzva' },
  bat_mitzva: { label: 'Bat Mitzva' },
} as const;

/**
 * Builds the event title from the host names.
 *
 * The title is generated, never typed: the names screen is the only place these
 * names are captured, and the couple never sees an editable title field. It is
 * regenerated on every names edit, so it always agrees with `host_details`.
 *
 * Returns an empty string only when there is nothing to build from, which is
 * what a Draft Event carries until the names screen is answered.
 */
export function buildEventTitle(
  eventType: EventTypeKey,
  names: EventHostNames,
  locale: string,
): string {
  const t = locale === 'he' ? HE : EN;
  const trim = (v?: string) => v?.trim() || undefined;

  if (isCoupleEvent(eventType)) {
    const copy = t[eventType as 'wedding' | 'henna'];
    const first = trim(names.brideName);
    const second = trim(names.groomName);

    if (first && second) {
      const joined =
        locale === 'he' ? `${first} ו${second}` : `${first} and ${second}`;
      return `${copy.prefix} ${joined}`;
    }
    if (first || second) return `${copy.prefix} ${first ?? second}`;
    return copy.fallback;
  }

  const copy = t[eventType as 'bar_mitzva' | 'bat_mitzva'];
  const child = trim(names.childName);
  if (!child) return copy.label;
  return locale === 'he'
    ? `${copy.label} של ${child}`
    : `${child}'s ${copy.label}`;
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
