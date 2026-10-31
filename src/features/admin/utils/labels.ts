import type { ScheduleSendGateRefusal } from '@/features/schedules/services/schedule-send-gate';
import type {
  CatchUpExclusion,
  CatchUpNote,
  CatchUpRejection,
} from '@/features/schedules/utils/catch-up';
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
  advance_reminder: 'תזכורת מוקדמת',
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
  if (targetStatus === 'not_declined') return countLabel(count, 'רשומה אחת שלא סירבה', 'רשומות שלא סירבו');
  return countLabel(count, 'רשומת אורח אחת', 'רשומות אורחים');
}

/** Signal kinds as group headings, plural. */
export const SIGNAL_GROUP_LABELS: Record<SignalKind, string> = {
  overdue_schedule: 'תזמונים באיחור',
  failed_delivery: 'שליחות שנכשלו',
  no_ask_planned: 'אין בקשת אישור מתוכננת',
  stale_call_round: 'סבבי שיחות תקועים',
};

// Catch-up and send-gate codes (features/schedules), worded for an Operator.

const SEND_GATE_REFUSALS: Record<ScheduleSendGateRefusal, string> = {
  not_found: 'התזמון הזה כבר לא קיים',
  not_message: 'סבבי שיחות לא נשלחים מכאן',
  sending_off: 'השליחה לא מופעלת לאירוע הזה',
};

export function sendGateRefusalLabel(reason: ScheduleSendGateRefusal): string {
  return SEND_GATE_REFUSALS[reason];
}

/** A send that could not check the Record Package is never made on a guess (ADR 0027) */
export const PACKAGE_UNKNOWN_LABEL = 'לא הצלחנו לבדוק את חבילת הרשומות';

const CATCH_UP_REJECTIONS: Record<CatchUpRejection, string> = {
  cancelled: 'התזמון בוטל',
  expired: 'התזמון פג בלי שנשלח, אז אין למי להשלים',
  disabled: 'השליחה לא הופעלה לתזמון הזה',
  not_sent_yet:
    'התזמון עוד לא נשלח - כשיישלח הוא יכלול את כל האורחים שברשימה באותו רגע',
  event_over: 'האירוע כבר עבר',
};

export function catchUpRejectionLabel(reason: CatchUpRejection): string {
  return CATCH_UP_REJECTIONS[reason];
}

const CATCH_UP_EXCLUSIONS: Record<CatchUpExclusion, string> = {
  failed: 'השליחה אליו נכשלה - שליחה חוזרת נעשית מהשורה של התזמון בציר התקשורת',
  outside_package:
    'מחוץ לחבילת הרשומות - צריך להגדיל את החבילה לפני שאפשר לשלוח',
  no_phone: 'אין מספר טלפון תקין',
  sms_abroad: 'מספר מחו"ל - התזמון הזה נשלח ב-SMS, שמגיע רק למספרים בישראל',
};

export function catchUpExclusionLabel(reason: CatchUpExclusion): string {
  return CATCH_UP_EXCLUSIONS[reason];
}

const CATCH_UP_NOTES: Record<CatchUpNote, string> = {
  no_phone: 'לא נשלח בזמנו - לא היה מספר טלפון',
  outside_package: 'לא נשלח בזמנו - הרשומה הייתה מחוץ לחבילה',
  other: 'לא נשלח בזמנו',
};

export function catchUpNoteLabel(note: CatchUpNote): string {
  return CATCH_UP_NOTES[note];
}
