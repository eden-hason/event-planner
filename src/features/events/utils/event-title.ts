import { EventTypeKeySchema, isCoupleEvent, type EventTypeKey } from '../schemas';

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

/**
 * The Occasion Phrase frames, without the definite article: they follow a
 * preposition in the message ("הוזמנתם ל" + "חתונה של נועה ודורון"), where
 * the title's "החתונה של" would read "להחתונה". The mitzvas keep their ה on
 * מצווה, which is where it belongs in both forms.
 */
const OCCASION = {
  wedding: 'חתונה של',
  henna: 'חינה של',
  bar_mitzva: 'בר המצווה של',
  bat_mitzva: 'בת המצווה של',
} as const satisfies Record<EventTypeKey, string>;

/**
 * The Occasion Phrase (CONTEXT.md): how an Event is named inside a message sent
 * for it - "חתונה של נועה ודורון", "בר המצווה של רועי". It is what lets one
 * Template speak for every event type, the type-specific wording arriving in a
 * placeholder rather than in the fixed text Meta approves.
 *
 * Always Hebrew, because the messages are, and built from the hosts rather than
 * read off the stored title, which follows the Owner's locale and carries the
 * article. Null when there is no phrase to build - an unknown type or no names
 * yet - and deliberately no fallback: "הוזמנתם ל" followed by the title reads
 * wrong, and a type without a frame gets a template of its own rather than a
 * guess (see docs/backlog/0003-general-event-type.md).
 */
export function buildOccasionPhrase(params: {
  eventTypeKey: string | undefined;
  hostDetails: Record<string, unknown> | undefined;
}): string | null {
  const eventType = EventTypeKeySchema.safeParse(params.eventTypeKey);
  if (!eventType.success) return null;
  const hosts = resolveHosts(eventType.data, readHostNames(params.hostDetails));
  if (hosts.length === 0) return null;
  return `${OCCASION[eventType.data]} ${hosts.join(' ו')}`;
}

/**
 * "Is coming up", agreeing with the occasion: a wedding, a henna and a bat
 * mitzva take the feminine, a bar mitzva the masculine.
 */
const APPROACHING = {
  wedding: 'מתקרבת',
  henna: 'מתקרבת',
  bar_mitzva: 'מתקרב',
  bat_mitzva: 'מתקרבת',
} as const satisfies Record<EventTypeKey, string>;

/**
 * The follow-up round's opening line - "החתונה של נועה ודורון מתקרבת",
 * "בר המצווה של רועי מתקרב". The whole line is one placeholder because the
 * verb agrees with the occasion, which no fixed text around a phrase can do.
 * It stands at the start of its line, so it takes the title's frame, article
 * and all. Null exactly when the Occasion Phrase is.
 */
export function buildApproachingLine(params: {
  eventTypeKey: string | undefined;
  hostDetails: Record<string, unknown> | undefined;
}): string | null {
  const eventType = EventTypeKeySchema.safeParse(params.eventTypeKey);
  if (!eventType.success) return null;
  const hosts = resolveHosts(eventType.data, readHostNames(params.hostDetails));
  if (hosts.length === 0) return null;
  return `${HE[eventType.data].prefix} ${hosts.join(' ו')} ${APPROACHING[eventType.data]}`;
}

/**
 * "Is taking place", agreeing with the occasion like APPROACHING does.
 */
const TAKING_PLACE = {
  wedding: 'מתקיימת',
  henna: 'מתקיימת',
  bar_mitzva: 'מתקיים',
  bat_mitzva: 'מתקיימת',
} as const satisfies Record<EventTypeKey, string>;

/**
 * The Event Reminder's opening line - "החתונה של נועה ודורון מתקיימת היום",
 * "בר המצווה של רועי מתקיים היום". One placeholder for the whole line for the
 * same reason as buildApproachingLine: the verb agrees with the occasion. Null
 * exactly when the Occasion Phrase is.
 */
export function buildTodayLine(params: {
  eventTypeKey: string | undefined;
  hostDetails: Record<string, unknown> | undefined;
}): string | null {
  const eventType = EventTypeKeySchema.safeParse(params.eventTypeKey);
  if (!eventType.success) return null;
  const hosts = resolveHosts(eventType.data, readHostNames(params.hostDetails));
  if (hosts.length === 0) return null;
  return `${HE[eventType.data].prefix} ${hosts.join(' ו')} ${TAKING_PLACE[eventType.data]} היום`;
}
