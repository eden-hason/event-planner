import type { SignalKind } from '../types';

/**
 * The Back Office's Hebrew words (ADR 0037), in one place so each concept reads
 * the same on every page.
 *
 * Catalog rows the database stores in English (`event_types.name`,
 * `schedule_types.name`) are keyed by their catalog key, with the stored name as
 * the fallback, so a type added later still shows something.
 */

const EVENT_TYPE_NAMES: Record<string, string> = {
  wedding: 'חתונה',
  henna: 'חינה',
  bar_mitzva: 'בר מצווה',
  bat_mitzva: 'בת מצווה',
};

const SCHEDULE_TYPE_NAMES: Record<string, string> = {
  initial_invitation: 'הזמנה ראשונית',
  confirmation: 'אישור הגעה',
  event_reminder: 'תזכורת אירוע',
  post_event: 'הודעת תודה',
  phone_call: 'סבב שיחות',
};

export function eventTypeName(key: string | null | undefined, fallback?: string | null): string {
  return (key && EVENT_TYPE_NAMES[key]) || fallback || 'אירוע';
}

export function scheduleTypeName(key: string | null | undefined, fallback?: string | null): string {
  return (key && SCHEDULE_TYPE_NAMES[key]) || fallback || 'תזמון';
}

/** An Event's title, or the placeholder for one never given (blank counts as none). */
export function eventTitle(title: string | null | undefined): string {
  return title?.trim() || 'אירוע ללא שם';
}

/** The placeholder for an Owner with neither a name nor an email on file. */
export const UNKNOWN_OWNER = 'בעלים לא ידועים';

const COLLABORATOR_ROLES: Record<string, string> = {
  owner: 'בעלים',
  seating_manager: 'אחראי הושבה',
};

/** A collaborator's role on an Event (`event_collaborators.role`). */
export function collaboratorRoleLabel(role: string): string {
  return COLLABORATOR_ROLES[role] ?? role;
}

const RSVP: Record<string, string> = {
  confirmed: 'אישרו',
  declined: 'לא מגיעים',
  pending: 'ממתינים',
};

/** An RSVP state as the Back Office names it. */
export function rsvpLabel(status: string): string {
  return RSVP[status] ?? status;
}

const DELIVERY_STATUSES: Record<string, string> = {
  pending: 'בתור',
  queued: 'בתור',
  sending: 'בשליחה',
  sent: 'נשלח',
  delivered: 'נמסר',
  read: 'נקרא',
  failed: 'נכשל',
  not_sent: 'לא נשלח',
};

/** A Delivery status, as stored on `message_deliveries.status`. */
export function deliveryStatusLabel(status: string): string {
  return DELIVERY_STATUSES[status] ?? status;
}

/** "אירוע אחד", "1,204 אירועים" - a count with its noun. Hebrew has no plural suffix to bolt on. */
export function countLabel(value: number, one: string, many: string): string {
  return value === 1 ? one : `${value.toLocaleString('he-IL')} ${many}`;
}

/**
 * "12 רשומות ממתינות" - a Schedule's audience (`schedules.target_status`) with its
 * size. The unit is Guest Records, always named.
 */
export function audienceCountLabel(targetStatus: string | null | undefined, count: number): string {
  if (targetStatus === 'pending') return countLabel(count, 'רשומה ממתינה אחת', 'רשומות ממתינות');
  if (targetStatus === 'confirmed') return countLabel(count, 'רשומה מאושרת אחת', 'רשומות מאושרות');
  return countLabel(count, 'רשומת אורח אחת', 'רשומות אורחים');
}

/** Signal kinds as group headings, plural. */
export const SIGNAL_GROUP_LABELS: Record<SignalKind, string> = {
  overdue_schedule: 'תזמונים באיחור',
  failed_delivery: 'שליחות שנכשלו',
  no_ask_planned: 'אין בקשת אישור מתוכננת',
  stale_call_round: 'סבבי שיחות תקועים',
};
