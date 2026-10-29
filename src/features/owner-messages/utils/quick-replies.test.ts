import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isOwnerMessageQuickReplyLabel, ownerMessageQuickReply } from './quick-replies';

const SITE = 'https://kulu-lu.com';

describe('ownerMessageQuickReply', () => {
  it('answers the Welcome button with the app link', () => {
    const result = ownerMessageQuickReply('welcome', 'ניהול האירוע', SITE);
    assert.equal(result?.action, 'app');
    assert.match(result?.body ?? '', /https:\/\/kulu-lu\.com\/app$/);
  });

  it('answers the Post-event button with the review link', () => {
    const result = ownerMessageQuickReply('post_event', 'להמלצה בגוגל', SITE);
    assert.equal(result?.action, 'review');
    assert.match(result?.body ?? '', /https:\/\/kulu-lu\.com\/review$/);
  });

  it('reads a label with stray whitespace, as a typed label arrives', () => {
    assert.equal(ownerMessageQuickReply('welcome', ' ניהול האירוע\n', SITE)?.action, 'app');
  });

  it('does not answer another kind of message’s button', () => {
    assert.equal(ownerMessageQuickReply('welcome', 'להמלצה בגוגל', SITE), null);
    assert.equal(ownerMessageQuickReply('post_event', 'ניהול האירוע', SITE), null);
  });

  it('does not answer free text', () => {
    assert.equal(ownerMessageQuickReply('post_event', 'תודה רבה!', SITE), null);
  });
});

describe('isOwnerMessageQuickReplyLabel', () => {
  it('knows every button label and nothing else', () => {
    assert.equal(isOwnerMessageQuickReplyLabel('ניהול האירוע'), true);
    assert.equal(isOwnerMessageQuickReplyLabel('להמלצה בגוגל'), true);
    assert.equal(isOwnerMessageQuickReplyLabel('מגיע/ה'), false);
    assert.equal(isOwnerMessageQuickReplyLabel(''), false);
  });
});
