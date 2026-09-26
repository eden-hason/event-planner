import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { answeredIndex, hasAnswered, resolveResumeStep } from './onboarding-progress';

describe('resolveResumeStep', () => {
  it('starts at the type question when nothing is answered', () => {
    assert.equal(resolveResumeStep(null), 'type');
    assert.equal(resolveResumeStep('unknown'), 'type');
  });

  it('resumes at the first unanswered question', () => {
    assert.equal(resolveResumeStep('type'), 'names');
    assert.equal(resolveResumeStep('date'), 'venue');
  });

  it('stays on the last question once everything is answered', () => {
    assert.equal(resolveResumeStep('venue'), 'venue');
  });

  it('treats the retired estimate step as everything answered', () => {
    assert.equal(resolveResumeStep('estimate'), 'venue');
  });
});

describe('hasAnswered', () => {
  it('counts a step and everything before it as answered', () => {
    assert.equal(hasAnswered('date', 'names'), true);
    assert.equal(hasAnswered('date', 'date'), true);
    assert.equal(hasAnswered('date', 'venue'), false);
    assert.equal(hasAnswered(null, 'type'), false);
  });

  it('counts every question as answered on the retired estimate step', () => {
    assert.equal(hasAnswered('estimate', 'venue'), true);
  });
});

describe('answeredIndex', () => {
  it('never moves an estimate marker behind venue', () => {
    assert.equal(answeredIndex('estimate'), answeredIndex('venue'));
  });
});
