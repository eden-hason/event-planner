/**
 * Shared test inputs: one wedding as `mapEventRow` maps it. Imported by tests
 * only.
 */

import { mapEventRow } from '../services/map-event-row';
import type {
  MessageLinks,
  MessagePlanEvent,
  MessagePlanGuest,
  MessagePlanSchedule,
} from './types';

export function weddingEvent(
  overrides: Partial<MessagePlanEvent> = {},
): MessagePlanEvent {
  const mapped = mapEventRow({
    id: 'e1',
    user_id: 'u1',
    title: 'החתונה של נועה ודורון',
    event_date: '2026-11-12T00:00:00.000Z', // a Thursday
    location: { name: 'אולמי הגן, ראשון לציון' },
    host_details: { bride: { name: 'נועה' }, groom: { name: 'דורון' } },
    invitations: { image_url: 'https://cdn.example.com/invitation.jpg' },
    invitation_video_url: 'https://cdn.example.com/invitation.mp4',
    reception_time: '19:30',
    ceremony_time: '20:30',
    short_code: 'aB3xY9',
    event_settings: {
      bit_config: { enabled: true, link: 'https://bit.example/pay' },
    },
    guests_experience: { send_table_numbers: true },
    event_types: { key: 'wedding' },
    message_plan: 'current',
  });
  return { ...mapped, ...overrides };
}

export const SEATED: MessagePlanGuest = {
  name: 'דנה לוי',
  phone: '+972541234567',
  table: { tableNumber: 12 },
};
export const UNSEATED: MessagePlanGuest = {
  name: 'דנה לוי',
  phone: '+972541234567',
  table: null,
};

export const LINKS: MessageLinks = {
  rsvp: 'https://kulu-lu.com/c/tok123',
  navigation: 'https://kulu-lu.com/nav/aB3xY9',
  gift: 'https://kulu-lu.com/r/aB3xY9',
};

export const TOKEN = 'tok123';

/** 10:00 Israel on the Event day, and on the day before. */
export const EVENT_DAY_10AM = '2026-11-12T08:00:00.000Z';
export const DAY_BEFORE_10AM = '2026-11-11T08:00:00.000Z';
export const DAY_AFTER_10AM = '2026-11-13T08:00:00.000Z';

export function schedule(
  overrides: Partial<MessagePlanSchedule> &
    Pick<MessagePlanSchedule, 'scheduleTypeKey'>,
): MessagePlanSchedule {
  const ask =
    overrides.scheduleTypeKey === 'invitation' ||
    overrides.scheduleTypeKey === 'follow_up';
  return {
    wording: 'kululu',
    personalText: null,
    attachment: ask ? 'none' : null,
    giftButton: ask ? null : false,
    scheduledFor: EVENT_DAY_10AM,
    ...overrides,
  };
}
