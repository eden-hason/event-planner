import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ownerMessageStatusUpdate } from './status';

describe('ownerMessageStatusUpdate', () => {
  it('only ever advances', () => {
    assert.equal(ownerMessageStatusUpdate('delivered')?.from.includes('read'), false);
    assert.equal(ownerMessageStatusUpdate('read')?.from.includes('delivered'), true);
  });

  it('reads Meta’s sent as accepted, lifting only an unanswered send', () => {
    assert.deepEqual(ownerMessageStatusUpdate('sent'), {
      status: 'accepted',
      from: ['sending', 'unknown'],
    });
  });

  it('lets failed override everything that went out, and nothing that did not', () => {
    const failed = ownerMessageStatusUpdate('failed');
    assert.equal(failed?.from.includes('read'), true);
    assert.equal(failed?.from.includes('expired'), false);
    assert.equal(failed?.from.includes('pending'), false);
  });

  it('ignores a status it does not know', () => {
    assert.equal(ownerMessageStatusUpdate('deleted'), null);
    assert.equal(ownerMessageStatusUpdate('constructor'), null);
  });
});
