import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error Node's type-stripping test runner requires the source extension
import { smsOutcomeFromReport } from './sms-delivery-report.ts';

// Shapes as ActiveTrail returned them from GET /api/smscampaignreport/{id}, 2026-10-15.

test('a delivered SMS reads as delivered', () => {
  assert.equal(
    smsOutcomeFromReport({ sent: 1, delivered: 1, errors: 0, unsubscribed: 0 }),
    'delivered',
  );
});

test('an errored SMS reads as failed', () => {
  assert.equal(
    smsOutcomeFromReport({ sent: 1, delivered: 0, errors: 1, unsubscribed: 0 }),
    'failed',
  );
});

test('neither delivered nor errored is not yet known, never failed', () => {
  // The carrier has not answered yet. Reading this as failed would send guests
  // a duplicate the moment a resend reopens for them.
  assert.equal(
    smsOutcomeFromReport({ sent: 1, delivered: 0, errors: 0, unsubscribed: 0 }),
    'unknown',
  );
});

test('a delivery receipt outranks an error count', () => {
  assert.equal(smsOutcomeFromReport({ sent: 1, delivered: 1, errors: 1 }), 'delivered');
});

test('a report missing its counts is not yet known', () => {
  assert.equal(smsOutcomeFromReport({}), 'unknown');
  assert.equal(smsOutcomeFromReport(null), 'unknown');
});
