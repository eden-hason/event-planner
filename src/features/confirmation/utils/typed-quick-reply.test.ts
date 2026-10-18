import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { matchTypedQuickReply } from './typed-quick-reply';

// As stored on the confirmation_1 templates.
const BUTTONS = [
  {
    text: 'נגיע בשמחה',
    index: 0,
    subType: 'quick_reply',
    placeholders: [{ source: 'confirmationToken', transformer: 'rsvpYesPayload' }],
  },
  {
    text: 'לא נוכל להגיע',
    index: 1,
    subType: 'quick_reply',
    placeholders: [{ source: 'confirmationToken', transformer: 'rsvpNoPayload' }],
  },
];

describe('matchTypedQuickReply', () => {
  it('reads each RSVP button label as its answer', () => {
    assert.equal(matchTypedQuickReply(BUTTONS, 'נגיע בשמחה'), 'yes');
    assert.equal(matchTypedQuickReply(BUTTONS, 'לא נוכל להגיע'), 'no');
  });

  it('ignores surrounding whitespace, doubled spaces and direction marks', () => {
    assert.equal(matchTypedQuickReply(BUTTONS, '  נגיע  בשמחה\n'), 'yes');
    assert.equal(matchTypedQuickReply(BUTTONS, '‏לא נוכל‏ להגיע'), 'no');
  });

  it('does not interpret free text, even close to a label', () => {
    for (const text of ['נגיע', 'נגיע בשמחה!', 'נגיע בשמחה 2', 'לא', 'כן', '', '   ']) {
      assert.equal(matchTypedQuickReply(BUTTONS, text), null, text);
    }
  });

  it('only reads quick replies that carry an RSVP payload', () => {
    const buttons = [
      { text: 'נגיע בשמחה', subType: 'url', placeholders: [{ transformer: 'rsvpYesPayload' }] },
      { text: 'לא נוכל להגיע', subType: 'quick_reply', placeholders: [{ transformer: 'none' }] },
    ];
    assert.equal(matchTypedQuickReply(buttons, 'נגיע בשמחה'), null);
    assert.equal(matchTypedQuickReply(buttons, 'לא נוכל להגיע'), null);
  });

  it('is null for a template with no buttons or a malformed payload', () => {
    for (const buttons of [undefined, null, [], {}, [null], [{ subType: 'quick_reply' }]]) {
      assert.equal(matchTypedQuickReply(buttons, 'נגיע בשמחה'), null);
    }
  });
});
