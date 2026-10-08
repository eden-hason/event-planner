import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FEATURED_ACTION_SLOTS, rankFeaturedActions } from './featured-actions';
import type { FeaturedActionFacts } from '../types';

/** An event with nothing left to do, so only the fact under test makes an action eligible. */
const settled: FeaturedActionFacts = {
  detailsComplete: true,
  guestRecords: 50,
  groupCount: 3,
  hasInvitationImage: true,
  collaboratorCount: 2,
  duplicateRecords: 0,
  noPhoneRecords: 0,
  canReceiveTestMessage: false,
  confirmedHeads: 0,
  tableCount: 0,
  giftingConfigured: true,
  hasPreviewToken: false,
  expenseCount: 1,
  recordsOverPackage: 0,
  noAskPlanned: false,
};

describe('no ask planned', () => {
  it('asks the Owner to date an ask, ahead of every setup step', () => {
    const ranked = rankFeaturedActions({
      ...settled,
      noAskPlanned: true,
      detailsComplete: false,
      hasInvitationImage: false,
      collaboratorCount: 1,
    });
    assert.equal(ranked[0], 'planAsk');
  });

  it('is gone once an ask is dated', () => {
    assert.ok(!rankFeaturedActions(settled).includes('planAsk'));
  });
});

describe('package warning', () => {
  it('no package warning while the list fits the package', () => {
    assert.ok(!rankFeaturedActions(settled).includes('package'));
  });

  it('a list over the package puts the warning first', () => {
    assert.equal(rankFeaturedActions({ ...settled, recordsOverPackage: 15 })[0], 'package');
  });

  it('the warning outranks every setup step, even when setup alone fills the slots', () => {
    const ranked = rankFeaturedActions({
      ...settled,
      detailsComplete: false,
      groupCount: 0,
      hasInvitationImage: false,
      collaboratorCount: 1,
      recordsOverPackage: 1,
    });
    assert.equal(ranked.length, FEATURED_ACTION_SLOTS);
    assert.equal(ranked[0], 'package');
  });
});
