import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error Node's type-stripping test runner requires the source extension
import { awaitingSmsFallback, classifySmsFallbackCandidates, stuckForHours } from './send-sms-fallback.ts';
// @ts-expect-error Node's type-stripping test runner requires the source extension
import { smsFallbackReason } from '../utils/send-helpers.ts';

const NOW = new Date('2026-10-07T16:00:00Z');
const WINDOW = { now: NOW, minHours: 2, maxHours: 72 };
const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 3_600_000).toISOString();

function row(overrides: {
  status: 'failed' | 'sent';
  attempts: {
    channel: 'whatsapp' | 'sms';
    status: string;
    error_code?: number | null;
    sent_at?: string | null;
    created_at?: string;
  }[];
  phone?: string | null;
}) {
  return {
    id: 'delivery-1',
    status: overrides.status,
    guest_id: 'guest-1',
    confirmation_token: 'token',
    guests: { name: 'Dana', phone_number: overrides.phone === undefined ? '0521234567' : overrides.phone },
    message_delivery_attempts: overrides.attempts.map((a) => ({
      error_code: null,
      error_message: null,
      sent_at: null,
      created_at: hoursAgo(30),
      ...a,
    })),
  };
}

// ─── The Stuck window ─────────────────────────────────────────────────────────

test('a WhatsApp accepted inside the window is stuck', () => {
  assert.equal(Math.floor(stuckForHours(hoursAgo(24), WINDOW) ?? -1), 24);
});

test('a WhatsApp accepted moments ago is not stuck yet', () => {
  assert.equal(stuckForHours(hoursAgo(1), WINDOW), null);
});

test('a WhatsApp accepted weeks ago is left alone', () => {
  // Hundreds of sends from before receipts were recorded sit here in prod.
  assert.equal(stuckForHours(hoursAgo(24 * 30), WINDOW), null);
});

test('an attempt never accepted is not stuck', () => {
  assert.equal(stuckForHours(null, WINDOW), null);
});

// ─── Classification ───────────────────────────────────────────────────────────

test('a stuck WhatsApp with no SMS yet is a candidate', () => {
  // Asserts the row is picked up rather than which list it lands in: under the
  // tsx test runner libphonenumber-js loads its metadata wrapped in `default`,
  // so every phone reads as invalid here and an eligible guest lands in
  // `no_phone`. In the app the same guest is eligible.
  const { eligible, excluded } = classifySmsFallbackCandidates(
    [row({ status: 'sent', attempts: [{ channel: 'whatsapp', status: 'sent', sent_at: hoursAgo(24) }] })],
    WINDOW,
  );
  const [candidate] = [...eligible, ...excluded];
  assert.equal(eligible.length + excluded.length, 1);
  assert.equal(candidate.errorCode, null);
  if (eligible.length) assert.match(eligible[0].reason, /never confirmed delivered/);
});

test('a stuck WhatsApp already followed by an SMS is not a candidate', () => {
  const { eligible, excluded } = classifySmsFallbackCandidates(
    [
      row({
        status: 'sent',
        attempts: [
          { channel: 'whatsapp', status: 'sent', sent_at: hoursAgo(24), created_at: hoursAgo(24) },
          { channel: 'sms', status: 'sent', sent_at: hoursAgo(20), created_at: hoursAgo(20) },
        ],
      }),
    ],
    WINDOW,
  );
  assert.equal(eligible.length, 0);
  assert.equal(excluded.length, 0);
});

test('a Sent delivery still waiting for its receipt is silently skipped', () => {
  const { eligible, excluded } = classifySmsFallbackCandidates(
    [row({ status: 'sent', attempts: [{ channel: 'whatsapp', status: 'sent', sent_at: hoursAgo(1) }] })],
    WINDOW,
  );
  assert.equal(eligible.length + excluded.length, 0);
});

test('a stuck WhatsApp with no usable phone is excluded, not sent', () => {
  const { eligible, excluded } = classifySmsFallbackCandidates(
    [
      row({
        status: 'sent',
        phone: null,
        attempts: [{ channel: 'whatsapp', status: 'sent', sent_at: hoursAgo(24) }],
      }),
    ],
    WINDOW,
  );
  assert.equal(eligible.length, 0);
  assert.equal(excluded[0]?.exclusion, 'no_phone');
});

// ─── Why a fallback went out ──────────────────────────────────────────────────

test('a fallback after a failed WhatsApp reads as failed', () => {
  assert.equal(
    smsFallbackReason([
      { channel: 'whatsapp', status: 'failed', triggered_by: 'scheduled' },
      { channel: 'sms', status: 'sent', triggered_by: 'fallback_auto' },
    ]),
    'failed',
  );
});

test('a fallback after a stuck WhatsApp reads as unconfirmed', () => {
  assert.equal(
    smsFallbackReason([
      { channel: 'whatsapp', status: 'sent', triggered_by: 'scheduled' },
      { channel: 'sms', status: 'sent', triggered_by: 'fallback_auto' },
    ]),
    'unconfirmed',
  );
});

test('a late WhatsApp receipt keeps the fallback unconfirmed, never failed', () => {
  assert.equal(
    smsFallbackReason([
      { channel: 'whatsapp', status: 'delivered', triggered_by: 'scheduled' },
      { channel: 'sms', status: 'sent', triggered_by: 'fallback' },
    ]),
    'unconfirmed',
  );
});

test('no fallback attempt means no reason', () => {
  assert.equal(
    smsFallbackReason([{ channel: 'whatsapp', status: 'sent', triggered_by: 'scheduled' }]),
    null,
  );
});

// ─── What the results screen may call on its way ──────────────────────────────

test('an SMS already being sent is on its way, even under a Freeze', () => {
  const awaiting = awaitingSmsFallback(
    [
      row({
        status: 'failed',
        attempts: [
          { channel: 'whatsapp', status: 'failed', error_code: 131026 },
          { channel: 'sms', status: 'pending' },
        ],
      }),
    ],
    { frozen: true, window: WINDOW },
  );
  assert.deepEqual([...awaiting], ['delivery-1']);
});

test('a system-level failure has no SMS on its way', () => {
  const awaiting = awaitingSmsFallback(
    [row({ status: 'failed', attempts: [{ channel: 'whatsapp', status: 'failed', error_code: 132000 }] })],
    { frozen: false, window: WINDOW },
  );
  assert.equal(awaiting.size, 0);
});

test('a fallback SMS that failed too has nothing more on its way', () => {
  const awaiting = awaitingSmsFallback(
    [
      row({
        status: 'failed',
        attempts: [
          { channel: 'whatsapp', status: 'failed', error_code: 131026 },
          { channel: 'sms', status: 'failed' },
        ],
      }),
    ],
    { frozen: false, window: WINDOW },
  );
  assert.equal(awaiting.size, 0);
});

test('a stuck WhatsApp is left to read as on its way, not as an SMS', () => {
  // Only Failed deliveries change state here - a Sent one already reads as
  // "on its way", and its receipt may still land.
  const awaiting = awaitingSmsFallback(
    [row({ status: 'sent', attempts: [{ channel: 'whatsapp', status: 'sent', sent_at: hoursAgo(24) }] })],
    { frozen: false, window: WINDOW },
  );
  assert.equal(awaiting.size, 0);
});
