import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isSameEmail } from './index';

describe('isSameEmail', () => {
  it('ignores letter case', () => {
    assert.equal(
      isSameEmail('maximStillis@gmail.com', 'maximstillis@gmail.com'),
      true,
    );
  });

  it('ignores surrounding whitespace', () => {
    assert.equal(isSameEmail(' a@gmail.com ', 'a@gmail.com'), true);
  });

  it('tells different addresses apart', () => {
    assert.equal(isSameEmail('a@gmail.com', 'b@gmail.com'), false);
  });

  it('never matches a missing address', () => {
    assert.equal(isSameEmail(undefined, undefined), false);
    assert.equal(isSameEmail(null, 'a@gmail.com'), false);
    assert.equal(isSameEmail('', ''), false);
  });
});
