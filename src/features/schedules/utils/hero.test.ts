import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { OutreachItemStatus } from '../types';
import { heroModel, type HeroEntry } from './hero';

const DUE = '2026-10-22T07:00:00Z';

let seq = 0;
function entry(
  status: OutreachItemStatus,
  overrides: Partial<HeroEntry> = {},
): HeroEntry {
  seq += 1;
  return {
    id: `s${seq}`,
    label: `Schedule ${seq}`,
    status,
    scheduleTypeKey: 'event_reminder',
    scheduledDate: status === 'undated' ? null : DUE,
    audienceCount: 100,
    when: '22.10 · 10:00',
    callProgress: null,
    finishedOn: null,
    withoutTable: 0,
    ...overrides,
  };
}

/** The model of a plan that can send, for the tests that read its parts. */
function unlocked(entries: HeroEntry[]) {
  const model = heroModel(entries);
  if (model.locked) throw new Error('expected an unlocked plan');
  return model;
}

test('a locked plan reports only its size', () => {
  const model = heroModel([entry('locked'), entry('locked'), entry('locked')]);
  assert.deepEqual(model, { locked: true, total: 3 });
});

test('mid-plan: sent, then scheduled, and the next send is the first pending', () => {
  const pending = entry('pending', { label: 'Second reminder' });
  const model = unlocked([
    entry('sent'),
    entry('sent'),
    pending,
    entry('pending'),
  ]);
  assert.deepEqual(model.segments, ['sent', 'sent', 'scheduled', 'scheduled']);
  assert.deepEqual(model.counts, {
    sent: 2,
    scheduled: 2,
    undated: 0,
    skipped: 0,
  });
  assert.equal(model.focus?.kind, 'next');
  assert.equal(
    model.focus?.kind === 'next' && model.focus.label,
    'Second reminder',
  );
  assert.equal(model.focus?.kind === 'next' && model.focus.datedOnly, false);
  assert.equal(model.attention, null);
});

test('with something undated the card names the next *dated* send', () => {
  const model = unlocked([entry('sent'), entry('pending'), entry('undated')]);
  assert.equal(model.focus?.kind === 'next' && model.focus.datedOnly, true);
});

test('expired and cancelled paint off and count as skipped', () => {
  const model = unlocked([
    entry('sent'),
    entry('expired'),
    entry('cancelled'),
    entry('pending'),
  ]);
  assert.deepEqual(model.segments, ['sent', 'off', 'off', 'scheduled']);
  assert.deepEqual(model.counts, {
    sent: 1,
    scheduled: 1,
    undated: 0,
    skipped: 2,
  });
});

test('a round being worked takes the card and paints as sent', () => {
  const live = entry('in_progress', {
    callProgress: { total: 41, awaiting: 29 },
  });
  const model = unlocked([entry('sent'), live, entry('pending')]);
  assert.deepEqual(model.segments, ['sent', 'sent', 'scheduled']);
  assert.deepEqual(model.focus, {
    kind: 'live',
    label: live.label,
    handled: 12,
    total: 41,
  });
});

test('everything out: the card reports the last one and when it went', () => {
  const last = entry('sent', { label: 'Thank you', finishedOn: '22.11' });
  const model = unlocked([
    entry('sent'),
    entry('completed'),
    entry('expired'),
    last,
  ]);
  assert.deepEqual(model.focus, {
    kind: 'done',
    scheduleId: last.id,
    label: 'Thank you',
    finishedOn: '22.11',
  });
});

test('nothing dated: no card, and the line points at the first ask', () => {
  const invitation = entry('undated', {
    scheduleTypeKey: 'initial_invitation',
  });
  const model = unlocked([
    invitation,
    entry('undated', { scheduleTypeKey: 'confirmation' }),
    entry('undated'),
  ]);
  assert.equal(model.focus, null);
  assert.deepEqual(model.attention, {
    kind: 'noAsk',
    scheduleId: invitation.id,
  });
});

test('undated asks fire even while the reminders are dated', () => {
  const invitation = entry('undated', {
    scheduleTypeKey: 'initial_invitation',
  });
  const model = unlocked([entry('pending'), invitation]);
  assert.deepEqual(model.attention, {
    kind: 'noAsk',
    scheduleId: invitation.id,
  });
});

test('dating any one ask clears the line', () => {
  const model = unlocked([
    entry('pending', { scheduleTypeKey: 'confirmation' }),
    entry('undated', { scheduleTypeKey: 'initial_invitation' }),
  ]);
  assert.equal(model.attention, null);
});

test('an undated reminder is not an attention item', () => {
  const model = unlocked([entry('sent'), entry('pending'), entry('undated')]);
  assert.equal(model.attention, null);
});

test('missing tables fire only when the table message is the next send', () => {
  const tables = entry('pending', { label: 'Table message', withoutTable: 12 });
  assert.deepEqual(unlocked([entry('sent'), tables]).attention, {
    kind: 'tables',
    label: 'Table message',
    count: 12,
  });
  assert.equal(unlocked([entry('pending'), tables]).attention, null);
});

test('no ask outranks missing tables', () => {
  const invitation = entry('undated', {
    scheduleTypeKey: 'initial_invitation',
  });
  const model = unlocked([entry('pending', { withoutTable: 5 }), invitation]);
  assert.equal(model.attention?.kind, 'noAsk');
});
