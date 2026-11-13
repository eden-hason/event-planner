import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extraFollowUpRejection, extraFollowUpRow, type ExtraFollowUpEvent } from './extra-follow-up';

const NOW = new Date('2026-11-13T10:00:00Z');
const event: ExtraFollowUpEvent = {
  status: 'published',
  eventDate: '2026-12-10T00:00:00Z',
  messagePlan: 'current',
  canCreateSchedules: true,
  imageUrl: 'https://cdn.example.com/invitation.jpg',
};

test('only an Event on the current plan, published, dated and not over, gets an extra Follow-up', () => {
  assert.equal(extraFollowUpRejection(event, NOW), null);
  assert.notEqual(extraFollowUpRejection({ ...event, messagePlan: 'classic' }, NOW), null);
  assert.notEqual(extraFollowUpRejection({ ...event, status: 'draft' }, NOW), null);
  assert.notEqual(extraFollowUpRejection({ ...event, eventDate: null }, NOW), null);
  assert.notEqual(extraFollowUpRejection({ ...event, eventDate: '2026-11-01T00:00:00Z' }, NOW), null);
});

test('the Follow-up is undated, to pending Guests, with the image when there is one', () => {
  assert.deepEqual(extraFollowUpRow(event), {
    scheduled_date: null,
    target_status: 'pending',
    wording: 'kululu',
    attachment: 'image',
    status: null,
  });
  assert.equal(extraFollowUpRow({ ...event, imageUrl: null }).attachment, 'none');
  assert.equal(extraFollowUpRow({ ...event, imageUrl: 'not a url' }).attachment, 'none');
  assert.equal(extraFollowUpRow({ ...event, canCreateSchedules: false }).status, 'disabled');
});
