import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rsvpAttachment } from './rsvp-attachment';

const IMAGE = 'https://cdn.example.com/invitation.jpg';
const VIDEO = 'https://cdn.example.com/invitation.mp4';
const base = {
  messagePlan: 'current',
  scheduleTypeKey: 'invitation',
  attachment: 'image',
  imageUrl: IMAGE,
  videoUrl: VIDEO,
};

test('an Invitation shows what it attached, image or video', () => {
  assert.deepEqual(rsvpAttachment(base), { type: 'image', url: IMAGE });
  assert.deepEqual(rsvpAttachment({ ...base, attachment: 'video' }), { type: 'video', url: VIDEO });
  assert.equal(rsvpAttachment({ ...base, attachment: 'none' }), null);
});

test('a Follow-up never shows the video', () => {
  assert.deepEqual(rsvpAttachment({ ...base, scheduleTypeKey: 'follow_up' }), { type: 'image', url: IMAGE });
  assert.equal(rsvpAttachment({ ...base, scheduleTypeKey: 'follow_up', attachment: 'video' }), null);
});

test('a medium the Event no longer has shows nothing, never the other one', () => {
  assert.equal(rsvpAttachment({ ...base, imageUrl: null }), null);
  assert.equal(rsvpAttachment({ ...base, attachment: 'video', videoUrl: '' }), null);
});

test('Classic, and the Reminder and Thank You, show nothing here', () => {
  assert.equal(rsvpAttachment({ ...base, messagePlan: 'classic', scheduleTypeKey: 'confirmation' }), null);
  assert.equal(rsvpAttachment({ ...base, messagePlan: null }), null);
  assert.equal(rsvpAttachment({ ...base, scheduleTypeKey: 'event_reminder' }), null);
});
