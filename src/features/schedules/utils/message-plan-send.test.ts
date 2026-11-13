import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapEventRow } from '../services/map-event-row';
import { weddingEvent, EVENT_DAY_10AM, TOKEN } from '../message-plan/test-fixtures';
import {
  composeMessagePlanForGuest,
  renderMessagePlanForGuest,
  toMessagePlanSchedule,
} from './message-plan-send';

const SITE = 'https://kulu-lu.com/';
const guest = { name: 'דנה לוי', phone: '+972541234567' };

test('the mapped Event carries the type key, the ceremony time and the plan', () => {
  const event = mapEventRow({
    id: 'e1',
    event_types: { key: 'wedding' },
    ceremony_time: '18:00',
    message_plan: 'current',
  });
  assert.equal(event.eventTypeKey, 'wedding');
  assert.equal(event.ceremonyTime, '18:00');
  assert.equal(event.messagePlan, 'current');
  // A row without the column is Classic.
  assert.equal(mapEventRow({ id: 'e2' }).messagePlan, 'classic');
});

test('a parsed Schedule becomes the renderer’s Schedule, the Due Time as scheduledFor', () => {
  assert.deepEqual(
    toMessagePlanSchedule({ scheduleTypeKey: 'follow_up', scheduledDate: null }),
    {
      scheduleTypeKey: 'follow_up',
      wording: null,
      personalText: null,
      attachment: null,
      giftButton: null,
      scheduledFor: null,
    },
  );
});

test('an Invitation renders both payloads, the SMS saying the same words with the RSVP link', () => {
  const result = renderMessagePlanForGuest({
    schedule: {
      scheduleTypeKey: 'invitation',
      wording: 'kululu',
      attachment: 'image',
      scheduledDate: EVENT_DAY_10AM,
    },
    event: weddingEvent(),
    guest,
    table: null,
    confirmationToken: TOKEN,
    siteUrl: SITE,
  });
  assert.ok(result.ok);
  assert.equal(result.whatsapp.templateName, 'invitation_kululu_image');
  assert.equal(result.sms.to, '+972541234567');
  assert.ok(result.sms.body.startsWith(result.message.body));
  assert.ok(result.sms.body.includes('https://kulu-lu.com/c/tok123'));
});

test('a Reminder with a table on a switched-on Event takes the tables shape', () => {
  const result = renderMessagePlanForGuest({
    schedule: {
      scheduleTypeKey: 'event_reminder',
      wording: 'kululu',
      giftButton: false,
      scheduledDate: EVENT_DAY_10AM,
    },
    event: weddingEvent(),
    guest,
    table: { tableNumber: 7, label: null },
    confirmationToken: TOKEN,
    siteUrl: SITE,
  });
  assert.ok(result.ok);
  assert.equal(result.whatsapp.templateName, 'event_reminder_kululu_today_tables');
});

test('a refusal comes back as one, never as a payload', () => {
  const result = renderMessagePlanForGuest({
    schedule: { scheduleTypeKey: 'event_reminder', scheduledDate: EVENT_DAY_10AM },
    event: weddingEvent({ location: null }),
    guest,
    table: null,
    confirmationToken: TOKEN,
    siteUrl: SITE,
  });
  assert.equal(result.ok, false);
});

test('the phoneless form gives Hand Delivery the SMS body with real links', () => {
  const result = composeMessagePlanForGuest({
    schedule: { scheduleTypeKey: 'follow_up', wording: 'kululu', attachment: 'none', scheduledDate: null },
    event: weddingEvent(),
    guest: { name: 'דנה' },
    table: null,
    confirmationToken: TOKEN,
    siteUrl: SITE,
  });
  assert.ok(result.ok);
  assert.ok(result.message.smsBody.includes('https://kulu-lu.com/c/tok123'));
  assert.ok(!result.message.smsBody.includes('['));
});
