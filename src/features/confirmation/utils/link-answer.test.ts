import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { linkAnswerAttempt } from './link-answer';

const answeredAt = new Date('2026-11-25T13:56:22Z');

describe('linkAnswerAttempt', () => {
  it('credits the SMS that followed a failed WhatsApp message', () => {
    const attempts = [
      { id: 'whatsapp', sent_at: '2026-11-25T08:00:51Z' },
      { id: 'sms', sent_at: '2026-11-25T08:15:34Z' },
    ];
    assert.equal(linkAnswerAttempt(attempts, answeredAt)?.id, 'sms');
  });

  it('credits the only message when there is one', () => {
    assert.equal(
      linkAnswerAttempt([{ id: 'whatsapp', sent_at: '2026-11-25T08:00:51Z' }], answeredAt)?.id,
      'whatsapp',
    );
  });

  it('reads the send time, not the order the rows came in', () => {
    const attempts = [
      { id: 'sms', sent_at: '2026-11-25T08:15:34Z' },
      { id: 'whatsapp', sent_at: '2026-11-25T08:00:51Z' },
    ];
    assert.equal(linkAnswerAttempt(attempts, answeredAt)?.id, 'sms');
  });

  it('skips a message that never went out', () => {
    const attempts = [
      { id: 'whatsapp', sent_at: '2026-11-25T08:00:51Z' },
      { id: 'pending', sent_at: null },
    ];
    assert.equal(linkAnswerAttempt(attempts, answeredAt)?.id, 'whatsapp');
  });

  it('skips a message sent after the answer', () => {
    const attempts = [
      { id: 'whatsapp', sent_at: '2026-11-25T08:00:51Z' },
      { id: 'later', sent_at: '2026-11-25T14:00:00Z' },
    ];
    assert.equal(linkAnswerAttempt(attempts, answeredAt)?.id, 'whatsapp');
  });

  it('finds nothing when no message went out', () => {
    assert.equal(linkAnswerAttempt([], answeredAt), null);
    assert.equal(linkAnswerAttempt([{ id: 'pending', sent_at: null }], answeredAt), null);
  });
});
