import type { EventReminderShape, ReminderDay } from '../shape';
import {
  GIFT_BUTTON,
  NAVIGATION_BUTTON,
  valueVariable,
  type BodyPart,
} from '../message-parts';
import type { StageDefinition } from './types';

const TABLE_LINE_LEAD = '\n🪑 מספר השולחן שלכם: ';

/**
 * The Event Reminder. Its Kululu Wording follows the day it is sent on
 * (meta-templates doc 3.1):
 *
 *  - on the Event day, `event_reminder_1` without the note: "today" in the
 *    opening line, no date
 *  - on an earlier day, `advance_reminder_1`: the approaching line and the date
 *
 * Both carry the table line for a Guest who has a table. The navigation button
 * is always there, the gift button when switched on and set up.
 */
export function eventReminderKululuBody(shape: {
  day: ReminderDay;
  table: boolean;
}): BodyPart[] {
  const parts: BodyPart[] = ['תזכורת 🎉\n'];
  if (shape.day === 'today') {
    parts.push(valueVariable('todayLine'), '\n\n📍 ');
  } else {
    parts.push(
      valueVariable('approachingLine'),
      '\n\n📅 ',
      valueVariable('eventDate'),
      '\n📍 ',
    );
  }
  parts.push(valueVariable('venueName'), '\n🕐 ', valueVariable('receptionTime'));
  if (shape.table) parts.push(TABLE_LINE_LEAD, valueVariable('tableNumber'));
  parts.push('\n\nמחכים לחגוג איתכם ❤️');
  return parts;
}

/** The same on any day, and with or without the gift (decided 2026-11-12). */
export const EVENT_REMINDER_WRAPPER = {
  opening: 'תזכורת לאירוע 🎉',
  closing: 'לניווט לאירוע 👇',
} as const;

export const eventReminderStage: StageDefinition<EventReminderShape> = {
  kululuBody: eventReminderKululuBody,
  wrapper: () => EVENT_REMINDER_WRAPPER,
  buttons: (shape) =>
    shape.gift ? [NAVIGATION_BUTTON, GIFT_BUTTON] : [NAVIGATION_BUTTON],
  // Every Reminder went in as Utility; Meta made three of them Marketing (meta-templates.ts).
  submittedCategory: { kululu: 'UTILITY', personal: 'MARKETING' },
};
