import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { followUpAttachment, messageMediaState } from './message-media';

const invitation = { id: 'inv', scheduleTypeKey: 'invitation', status: 'scheduled', attachment: 'video' as const };
const fu1 = { id: 'fu1', scheduleTypeKey: 'follow_up', status: 'scheduled', attachment: 'image' as const };
const fu2 = { id: 'fu2', scheduleTypeKey: 'follow_up', status: 'scheduled', attachment: 'image' as const };

describe('messageMediaState', () => {
  it('reads the Invitation choice and the open Follow-ups', () => {
    const state = messageMediaState([invitation, fu1, fu2]);
    assert.deepEqual(state.invitation, { scheduleId: 'inv', attachment: 'video', editable: true });
    assert.deepEqual(state.followUps, { count: 2, editableIds: ['fu1', 'fu2'], image: true });
  });

  it('treats a missing attachment as none', () => {
    const state = messageMediaState([{ ...invitation, attachment: null }]);
    assert.equal(state.invitation?.attachment, 'none');
  });

  it('marks a sent Invitation read-only', () => {
    const state = messageMediaState([{ ...invitation, status: 'sent' }]);
    assert.equal(state.invitation?.editable, false);
  });

  it('judges the image by the open Follow-ups only', () => {
    const state = messageMediaState([{ ...fu1, status: 'sent', attachment: 'none' }, fu2]);
    assert.deepEqual(state.followUps, { count: 2, editableIds: ['fu2'], image: true });
  });

  it('falls back to the sent Follow-ups when none is open', () => {
    const state = messageMediaState([{ ...fu1, status: 'sent' }, { ...fu2, status: 'sent' }]);
    assert.deepEqual(state.followUps, { count: 2, editableIds: [], image: true });
  });

  it('says no image when the Follow-ups differ or there are none', () => {
    assert.equal(messageMediaState([fu1, { ...fu2, attachment: 'none' }]).followUps.image, false);
    assert.equal(messageMediaState([]).followUps.image, false);
    assert.equal(messageMediaState([]).invitation, null);
  });

  it('counts a claimed Schedule as not editable', () => {
    const state = messageMediaState([{ ...invitation, dispatchedAt: '2026-11-14T10:00:00Z' }]);
    assert.equal(state.invitation?.editable, false);
  });
});

describe('followUpAttachment', () => {
  it('carries the image or nothing, whatever the Invitation sends', () => {
    assert.equal(followUpAttachment(true), 'image');
    assert.equal(followUpAttachment(false), 'none');
  });
});
