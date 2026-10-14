import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { continuesAnswer, type LatestAnswer } from './answer-run';

const latest: LatestAnswer = {
  interactionType: 'rsvp_confirm',
  channel: 'whatsapp',
  at: '2026-10-14T18:42:00Z',
};

const next = (at: string, overrides: Partial<Parameters<typeof continuesAnswer>[1]> = {}) => ({
  interactionType: 'rsvp_confirm' as const,
  channel: 'whatsapp',
  at: new Date(at),
  ...overrides,
});

describe('continuesAnswer', () => {
  it('a first answer is new', () => {
    assert.equal(continuesAnswer(null, next('2026-10-14T18:42:10Z')), false);
  });

  it('the next step of the same conversation continues it', () => {
    assert.equal(continuesAnswer(latest, next('2026-10-14T18:42:30Z')), true);
    assert.equal(continuesAnswer(latest, next('2026-10-14T19:12:00Z')), true);
  });

  it('coming back after half an hour is a new answer', () => {
    assert.equal(continuesAnswer(latest, next('2026-10-14T19:12:01Z')), false);
  });

  it('changing between confirmed and declined is a new answer', () => {
    assert.equal(
      continuesAnswer(latest, next('2026-10-14T18:43:00Z', { interactionType: 'rsvp_decline' })),
      false,
    );
  });

  it('answering through another channel is a new answer', () => {
    assert.equal(continuesAnswer(latest, next('2026-10-14T18:43:00Z', { channel: 'page' })), false);
  });
});
