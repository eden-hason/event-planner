/**
 * The values a Message Plan message is filled with, at send time and in the
 * preview: the Kululu Wordings' variables, and the Message Fields an Owner
 * places in a Personal Message (brief 7.3, CONTEXT.md "Message Field").
 *
 * Each value is read from the mapped Event and the Guest with the formatting
 * the Classic templates already use (the date through the `formatDate`
 * transformer, `he-IL`, `full`; the Occasion Phrase and its lines from
 * events/utils/event-title), so a Classic and a current-plan message say the
 * same date the same way.
 */

// Deep imports rather than the events barrel: the barrel carries Server
// Actions, and this module is pure and also runs in the browser and in tests.
import { EventTypeKeySchema } from '@/features/events/schemas';
import {
  buildEventTitleParts,
  readHostNames,
} from '@/features/events/utils/event-title';
import type { MissingDetail } from '../utils/missing-details';
import { STAGES, type Stage } from './shape';
import type { MessagePlanEvent, MessagePlanGuest } from './types';

/** A Kululu Wording variable. */
export type KululuValueKey =
  | 'occasionPhrase'
  | 'approachingLine'
  | 'todayLine'
  | 'eventDate'
  | 'venueName'
  | 'receptionTime'
  | 'tableNumber';

/** A Message Field an Owner can place in a Personal Message. */
export type MessageFieldKey =
  | 'hosts'
  | 'occasionPhrase'
  | 'eventDate'
  | 'venueName'
  | 'receptionTime'
  | 'ceremonyTime'
  | 'guestName'
  | 'tableNumber';

export type ValueKey = KululuValueKey | MessageFieldKey;

/** Who a value is read for: the Guest being sent to, or no one in particular. */
export type FillContext = {
  event: MessagePlanEvent;
  guest: Pick<MessagePlanGuest, 'name' | 'table'> | null;
};

// The format confirmation_1 uses through the Classic `formatDate` transformer
// (he-IL, full, UTC), so both plans say a date the same way. UTC because the
// date is stored at 00:00 UTC.
const EVENT_DATE_FORMAT = new Intl.DateTimeFormat('he-IL', {
  dateStyle: 'full',
  timeZone: 'UTC',
});

/** "יום חמישי, 12 בנובמבר 2026": the date exactly as `confirmation_1` formats it. */
export function formatEventDate(
  eventDate: string | null | undefined,
): string | null {
  if (!eventDate) return null;
  const date = new Date(eventDate);
  return isNaN(date.getTime()) ? eventDate : EVENT_DATE_FORMAT.format(date);
}

/** "נועה ודורון" - the hosts as the Event's title names them, or null. */
export function formatHosts(
  event: Pick<MessagePlanEvent, 'eventTypeKey' | 'hostDetails'>,
): string | null {
  const type = EventTypeKeySchema.safeParse(event.eventTypeKey);
  if (!type.success) return null;
  const { hosts } = buildEventTitleParts(
    type.data,
    readHostNames(event.hostDetails ?? undefined),
  );
  return hosts.length ? hosts.join(' ו') : null;
}

const trimmedOrNull = (value: string | null | undefined): string | null =>
  value?.trim() || null;

/**
 * A value for an Event and a Guest, or null when there is none. Per-Guest
 * values (the Guest's name, the table) are null with no Guest.
 */
export function fillValue(key: ValueKey, context: FillContext): string | null {
  const { event, guest } = context;
  switch (key) {
    case 'hosts':
      return formatHosts(event);
    case 'occasionPhrase':
      return trimmedOrNull(event.occasionPhrase);
    case 'approachingLine':
      return trimmedOrNull(event.approachingLine);
    case 'todayLine':
      return trimmedOrNull(event.todayLine);
    case 'eventDate':
      return formatEventDate(event.eventDate);
    case 'venueName':
      return trimmedOrNull(event.location?.name);
    case 'receptionTime':
      return trimmedOrNull(event.receptionTime);
    case 'ceremonyTime':
      return trimmedOrNull(event.ceremonyTime);
    case 'guestName':
      return trimmedOrNull(guest?.name);
    case 'tableNumber':
      return guest?.table ? String(guest.table.tableNumber) : null;
  }
}

/**
 * The Event detail an Owner fills in to give a value, in the vocabulary of
 * `missingDetails` (utils/missing-details.ts). Null for a per-Guest value and
 * for the ceremony time, which that vocabulary does not name.
 */
export const VALUE_DETAIL: Record<ValueKey, MissingDetail | null> = {
  hosts: 'hosts',
  occasionPhrase: 'hosts',
  approachingLine: 'hosts',
  todayLine: 'hosts',
  eventDate: 'eventDate',
  venueName: 'venue',
  receptionTime: 'receptionTime',
  ceremonyTime: null,
  guestName: null,
  tableNumber: null,
};

/**
 * The sample each Kululu Wording variable was submitted to Meta with
 * (meta-templates doc 3.1).
 */
export const KULULU_VALUE_META_SAMPLE: Record<KululuValueKey, string> = {
  occasionPhrase: 'חתונה של נועה ודורון',
  approachingLine: 'החתונה של נועה ודורון מתקרבת',
  todayLine: 'החתונה של נועה ודורון מתקיימת היום',
  eventDate: 'יום חמישי, 12 בנובמבר 2026',
  venueName: 'אולמי הגן, ראשון לציון',
  receptionTime: '19:30',
  tableNumber: '12',
};

export type MessageFieldDefinition = {
  key: MessageFieldKey;
  /** The palette label (brief 7.3). */
  label: string;
  /** What the token reads as when there is no Event to fill it from. */
  sample: string;
  stages: readonly Stage[];
  /** Read from the Guest, so it is never "empty at save time". */
  perGuest: boolean;
  /** Offered only when the Event has a value for it (the ceremony time). */
  onlyWhenEventHasValue: boolean;
  /** May only be placed inside the table sentence (brief 7.4). */
  tableSentenceOnly: boolean;
};

/**
 * The Message Fields, in palette order (brief 7.3). The venue address of the
 * brief is not here: an Event's location holds only its name and coordinates,
 * so there is nothing to fill it from.
 */
export const MESSAGE_FIELDS: readonly MessageFieldDefinition[] = [
  {
    key: 'hosts',
    label: 'שמות המארחים',
    sample: 'נועה ודורון',
    stages: STAGES,
    perGuest: false,
    onlyWhenEventHasValue: false,
    tableSentenceOnly: false,
  },
  {
    key: 'occasionPhrase',
    label: 'שם האירוע',
    sample: 'חתונה של נועה ודורון',
    stages: STAGES,
    perGuest: false,
    onlyWhenEventHasValue: false,
    tableSentenceOnly: false,
  },
  {
    key: 'eventDate',
    label: 'תאריך',
    sample: 'יום חמישי, 12 בנובמבר 2026',
    stages: STAGES,
    perGuest: false,
    onlyWhenEventHasValue: false,
    tableSentenceOnly: false,
  },
  {
    key: 'venueName',
    label: 'מקום',
    sample: 'אולמי הגן',
    stages: STAGES,
    perGuest: false,
    onlyWhenEventHasValue: false,
    tableSentenceOnly: false,
  },
  {
    key: 'receptionTime',
    label: 'קבלת פנים',
    sample: '19:30',
    stages: STAGES,
    perGuest: false,
    onlyWhenEventHasValue: false,
    tableSentenceOnly: false,
  },
  {
    key: 'ceremonyTime',
    label: 'חופה / טקס',
    sample: '20:30',
    stages: STAGES,
    perGuest: false,
    onlyWhenEventHasValue: true,
    tableSentenceOnly: false,
  },
  {
    key: 'guestName',
    label: 'שם האורח',
    sample: 'דנה לוי',
    stages: STAGES,
    perGuest: true,
    onlyWhenEventHasValue: false,
    tableSentenceOnly: false,
  },
  {
    key: 'tableNumber',
    label: 'שולחן',
    sample: '12',
    stages: ['event_reminder'],
    perGuest: true,
    onlyWhenEventHasValue: false,
    tableSentenceOnly: true,
  },
];

export function messageField(key: MessageFieldKey): MessageFieldDefinition {
  const field = MESSAGE_FIELDS.find((candidate) => candidate.key === key);
  if (!field) throw new Error(`Unknown Message Field ${key}`);
  return field;
}

export function isMessageFieldKey(value: unknown): value is MessageFieldKey {
  return MESSAGE_FIELDS.some((field) => field.key === value);
}

/**
 * The fields the palette offers on a stage. With an Event, a field offered
 * only when the Event has a value (the ceremony time) is left out when it has
 * none.
 */
export function messageFieldsFor(
  stage: Stage,
  event?: MessagePlanEvent,
): MessageFieldDefinition[] {
  return MESSAGE_FIELDS.filter(
    (field) =>
      field.stages.includes(stage) &&
      (!event ||
        !field.onlyWhenEventHasValue ||
        fillValue(field.key, { event, guest: null }) !== null),
  );
}
