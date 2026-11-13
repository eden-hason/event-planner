import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MESSAGE_FIELDS,
  fillValue,
  formatEventDate,
  formatHosts,
  messageFieldsFor,
} from './fields';
import { SEATED, UNSEATED, weddingEvent } from './test-fixtures';

test('values are read with the formatting Classic templates use', () => {
  const event = weddingEvent();
  const context = { event, guest: SEATED };
  assert.equal(fillValue('eventDate', context), 'יום חמישי, 12 בנובמבר 2026');
  assert.equal(fillValue('occasionPhrase', context), 'חתונה של נועה ודורון');
  assert.equal(
    fillValue('approachingLine', context),
    'החתונה של נועה ודורון מתקרבת',
  );
  assert.equal(
    fillValue('todayLine', context),
    'החתונה של נועה ודורון מתקיימת היום',
  );
  assert.equal(fillValue('hosts', context), 'נועה ודורון');
  assert.equal(fillValue('venueName', context), 'אולמי הגן, ראשון לציון');
  assert.equal(fillValue('receptionTime', context), '19:30');
  assert.equal(fillValue('ceremonyTime', context), '20:30');
  assert.equal(fillValue('guestName', context), 'דנה לוי');
  assert.equal(fillValue('tableNumber', context), '12');
});

test('a value the Event or Guest does not have is null, never a stand-in', () => {
  const event = weddingEvent({
    location: null,
    receptionTime: '  ',
    ceremonyTime: null,
    eventDate: null,
  });
  assert.equal(fillValue('venueName', { event, guest: null }), null);
  assert.equal(fillValue('receptionTime', { event, guest: null }), null);
  assert.equal(fillValue('ceremonyTime', { event, guest: null }), null);
  assert.equal(fillValue('eventDate', { event, guest: null }), null);
  assert.equal(fillValue('guestName', { event, guest: null }), null);
  assert.equal(fillValue('tableNumber', { event, guest: UNSEATED }), null);
  assert.equal(formatEventDate(undefined), null);
});

test('the hosts follow the event type, so a stale name from another type is not read', () => {
  const hostDetails = {
    bride: { name: 'נועה' },
    groom: { name: 'דורון' },
    child: { name: 'רועי' },
  };
  assert.equal(
    formatHosts({ eventTypeKey: 'bar_mitzva', hostDetails }),
    'רועי',
  );
  assert.equal(
    formatHosts({ eventTypeKey: 'henna', hostDetails }),
    'נועה ודורון',
  );
  assert.equal(formatHosts({ eventTypeKey: undefined, hostDetails }), null);
  assert.equal(formatHosts({ eventTypeKey: 'wedding', hostDetails: {} }), null);
});

test('the palette offers the table only on the Reminder, and the ceremony only when there is one', () => {
  const keys = (
    stage: Parameters<typeof messageFieldsFor>[0],
    event?: ReturnType<typeof weddingEvent>,
  ) => messageFieldsFor(stage, event).map((f) => f.key);
  assert.deepEqual(keys('invitation'), [
    'hosts',
    'occasionPhrase',
    'eventDate',
    'venueName',
    'receptionTime',
    'ceremonyTime',
    'guestName',
  ]);
  assert.ok(keys('event_reminder').includes('tableNumber'));
  assert.ok(
    !keys('thank_you', weddingEvent({ ceremonyTime: null })).includes(
      'ceremonyTime',
    ),
  );
  assert.ok(keys('thank_you', weddingEvent()).includes('ceremonyTime'));
  for (const field of MESSAGE_FIELDS)
    assert.ok(field.label && field.sample, field.key);
});
