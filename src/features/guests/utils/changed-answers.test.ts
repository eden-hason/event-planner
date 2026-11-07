import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  findChangedAnswers,
  settledAnswers,
  type ChangedAnswerGuest,
  type RsvpSnapshot,
} from './changed-answers';

const guest = (over: Partial<ChangedAnswerGuest> = {}): ChangedAnswerGuest => ({
  id: 'g1',
  name: 'Dana',
  phone: '+972544211802',
  rsvpStatus: 'confirmed',
  amount: 1,
  rsvpChangeSource: 'guest',
  rsvpChangedAt: '2026-11-05T17:20:00Z',
  ...over,
});

const confirm = (amount: number | null, at: string, over: Partial<RsvpSnapshot> = {}): RsvpSnapshot => ({
  guestId: 'g1',
  status: 'confirmed',
  amount,
  channel: 'whatsapp',
  at,
  ...over,
});

const decline = (at: string, over: Partial<RsvpSnapshot> = {}): RsvpSnapshot => ({
  guestId: 'g1',
  status: 'declined',
  amount: null,
  channel: 'whatsapp',
  at,
  ...over,
});

describe('findChangedAnswers', () => {
  it('lists a guest who lowered their count a day later', () => {
    const [row, ...rest] = findChangedAnswers(
      [guest()],
      [confirm(2, '2026-10-08T20:55:00Z'), confirm(1, '2026-11-05T17:21:00Z')],
    );
    assert.equal(rest.length, 0);
    assert.equal(row.kind, 'count');
    assert.deepEqual(row.previous, { status: 'confirmed', amount: 2, at: '2026-10-08T20:55:00Z' });
    assert.deepEqual(row.current, { status: 'confirmed', amount: 1, at: '2026-11-05T17:21:00Z' });
    assert.equal(row.current.at, '2026-11-05T17:21:00Z');
    assert.equal(row.history.length, 2);
  });

  it('lists a guest who cancelled', () => {
    const [row] = findChangedAnswers(
      [guest({ rsvpStatus: 'declined' })],
      [confirm(1, '2026-10-08T16:16:00Z'), decline('2026-11-05T14:54:00Z')],
    );
    assert.equal(row.kind, 'declined');
    assert.equal(row.current.amount, null);
  });

  it('lists a guest who said no and then came', () => {
    const [row] = findChangedAnswers(
      [guest({ amount: 2 })],
      [decline('2026-10-08T16:00:00Z'), confirm(2, '2026-10-20T10:00:00Z')],
    );
    assert.equal(row.kind, 'confirmed');
  });

  it('keeps a count that went back to where it started, with its whole path', () => {
    const [row] = findChangedAnswers(
      [guest()],
      [
        confirm(1, '2026-10-09T09:03:00Z'),
        confirm(2, '2026-10-09T09:45:00Z'),
        confirm(1, '2026-11-04T07:50:00Z'),
      ],
    );
    assert.equal(row.previous.amount, 2);
    assert.deepEqual(row.history.map((step) => step.amount), [1, 2, 1]);
    assert.equal(row.current.at, '2026-11-04T07:50:00Z');
  });

  it('times the change from when the answer first became what it is now', () => {
    const [row] = findChangedAnswers(
      [guest()],
      [
        confirm(2, '2026-10-01T10:00:00Z'),
        confirm(1, '2026-10-10T10:00:00Z'),
        confirm(1, '2026-10-20T10:00:00Z'),
      ],
    );
    assert.equal(row.current.at, '2026-10-10T10:00:00Z');
    assert.deepEqual(row.history.map((step) => step.amount), [2, 1]);
  });

  it('leaves out a guest whose answer never changed', () => {
    assert.deepEqual(
      findChangedAnswers([guest()], [confirm(1, '2026-10-08T10:00:00Z'), confirm(1, '2026-10-20T10:00:00Z')]),
      [],
    );
  });

  it('leaves out a flip inside one conversation', () => {
    assert.deepEqual(
      findChangedAnswers(
        [guest({ rsvpStatus: 'declined' })],
        [confirm(1, '2026-10-31T07:59:00Z'), decline('2026-10-31T07:59:40Z')],
      ),
      [],
    );
  });

  it('counts the same flip as a change when it came back later', () => {
    const rows = findChangedAnswers(
      [guest({ rsvpStatus: 'declined' })],
      [confirm(1, '2026-10-31T07:00:00Z'), decline('2026-10-31T08:00:00Z')],
    );
    assert.equal(rows.length, 1);
  });

  it('counts a quick change on another channel as a change', () => {
    const rows = findChangedAnswers(
      [guest({ rsvpStatus: 'declined' })],
      [confirm(1, '2026-10-31T07:59:00Z', { channel: 'page' }), decline('2026-10-31T08:00:00Z')],
    );
    assert.equal(rows.length, 1);
  });

  it('leaves out an answer the Owner overrode', () => {
    assert.deepEqual(
      findChangedAnswers(
        [guest({ amount: 2, rsvpChangeSource: 'manual' })],
        [confirm(1, '2026-10-08T10:00:00Z')],
      ),
      [],
    );
  });

  it('leaves out an answer an Operator took on a call', () => {
    assert.deepEqual(
      findChangedAnswers(
        [guest({ rsvpStatus: 'declined', rsvpChangeSource: 'admin_call' })],
        [confirm(1, '2026-10-08T10:00:00Z')],
      ),
      [],
    );
  });

  it('uses the record itself when the current answer left no snapshot', () => {
    const [row] = findChangedAnswers(
      [guest({ rsvpStatus: 'declined', rsvpChangedAt: '2026-11-01T10:00:00Z' })],
      [confirm(2, '2026-10-08T10:00:00Z')],
    );
    assert.deepEqual(row.current, { status: 'declined', amount: null, at: '2026-11-01T10:00:00Z' });
    assert.equal(row.history.length, 2);
  });

  it('does not call a confirm whose count was never kept a change', () => {
    assert.deepEqual(findChangedAnswers([guest({ amount: 3 })], [confirm(null, '2026-10-08T10:00:00Z')]), []);
  });

  it('skips a guest who has no answer of their own now', () => {
    assert.deepEqual(
      findChangedAnswers([guest({ rsvpStatus: 'pending' })], [confirm(1, '2026-10-08T10:00:00Z')]),
      [],
    );
  });

  it('puts the newest change first', () => {
    const rows = findChangedAnswers(
      [guest({ id: 'old' }), guest({ id: 'new' })],
      [
        confirm(2, '2026-10-01T10:00:00Z', { guestId: 'old' }),
        confirm(1, '2026-10-05T10:00:00Z', { guestId: 'old' }),
        confirm(2, '2026-10-01T10:00:00Z', { guestId: 'new' }),
        confirm(1, '2026-11-05T10:00:00Z', { guestId: 'new' }),
      ],
    );
    assert.deepEqual(rows.map((row) => row.guestId), ['new', 'old']);
  });
});

describe('settledAnswers', () => {
  it('orders snapshots by time whatever order they arrive in', () => {
    assert.deepEqual(
      settledAnswers([confirm(1, '2026-11-05T10:00:00Z'), confirm(2, '2026-10-01T10:00:00Z')]).map(
        (step) => step.amount,
      ),
      [2, 1],
    );
  });
});
