import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildCoPlannerLink,
  buildWhatsAppShareUrl,
  coPlannerAcceptPath,
  coPlannerLinkPath,
} from './index';

describe('buildCoPlannerLink', () => {
  it('joins the origin and the join path', () => {
    assert.equal(
      buildCoPlannerLink('https://kululu.co.il', 'abc123'),
      'https://kululu.co.il/join/abc123',
    );
  });

  it('does not double a trailing slash on the origin', () => {
    assert.equal(
      buildCoPlannerLink('https://kululu.co.il/', 'abc123'),
      'https://kululu.co.il/join/abc123',
    );
  });
});

describe('coPlannerLinkPath', () => {
  it('escapes anything that is not a plain token', () => {
    assert.equal(coPlannerLinkPath('a/b'), '/join/a%2Fb');
  });
});

describe('coPlannerAcceptPath', () => {
  it('sits under the link it accepts', () => {
    assert.equal(coPlannerAcceptPath('abc123'), '/join/abc123/accept');
  });
});

describe('buildWhatsAppShareUrl', () => {
  it('carries the whole message, link and Hebrew included', () => {
    const text = 'בואו נתכנן יחד https://kululu.co.il/join/abc?x=1&y=2';
    const url = new URL(buildWhatsAppShareUrl(text));
    assert.equal(url.origin, 'https://wa.me');
    assert.equal(url.searchParams.get('text'), text);
  });
});
