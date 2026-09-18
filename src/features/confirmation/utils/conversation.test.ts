import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  conversationStep,
  type ConversationEvent,
  type ConversationGuest,
  type OutgoingMessage,
} from './conversation';
import {
  encodeConversationId,
  parseConversationId,
  rsvpYesPayload,
  type ConversationAction,
} from './conversation-ids';
import { buildMealOptions } from './meal-options';
import { normalizeMealCounts, parseMealCounts, formatMealCounts } from './meal-counts';
import { isRsvpOpen } from './rsvp-cutoff';

const TOKEN = 'AbCdEf123456';

const event = (overrides: Partial<ConversationEvent> = {}): ConversationEvent => ({
  occasionPhrase: 'חתונה של נועה ודורון',
  lockGuestCount: false,
  mealOptions: buildMealOptions({ dietaryOptions: true, dietaryTypes: ['vegetarian', 'vegan'] }),
  rsvpOpen: true,
  rsvpUrl: 'https://kululu.test/c/AbCdEf123456',
  ...overrides,
});

const guest = (overrides: Partial<ConversationGuest> = {}): ConversationGuest => ({
  rsvpStatus: 'pending',
  amount: 3,
  mealCounts: {},
  ...overrides,
});

function step(action: ConversationAction, g = guest(), e = event()) {
  return conversationStep({ token: TOKEN, action, guest: g, event: e });
}

/** The actions a reply offers, decoded - what the Guest can tap next. */
function offered(reply: OutgoingMessage): ConversationAction[] {
  const ids = reply.kind === 'buttons' ? reply.buttons : reply.kind === 'list' ? reply.rows : [];
  return ids.map((b) => parseConversationId(b.id)!.action);
}

describe('conversation ids', () => {
  it('round-trips every action', () => {
    const actions: ConversationAction[] = [
      { type: 'yes' },
      { type: 'no' },
      { type: 'change' },
      { type: 'count', count: 4 },
      { type: 'count', count: 'other' },
      { type: 'mealQuestion', answer: true },
      { type: 'mealType', meal: 'none' },
      { type: 'mealType', meal: 'gluten_free' },
      { type: 'mealCount', meal: 'vegan', count: 2 },
      { type: 'mealMore', more: false },
    ];
    for (const action of actions) {
      const parsed = parseConversationId(encodeConversationId(TOKEN, action, 3));
      assert.deepEqual(parsed?.action, action);
      assert.equal(parsed?.token, TOKEN);
    }
  });

  it('keeps the template payloads to the bare three parts', () => {
    assert.equal(rsvpYesPayload(TOKEN), `kc1|${TOKEN}|yes`);
  });

  it('accepts an event preview token (a uuid)', () => {
    const uuid = '0b7a3c52-6a1e-4c1f-9d1e-7f3e2b1a0c9d';
    assert.equal(parseConversationId(`kc1|${uuid}|no`)?.token, uuid);
  });

  it('rejects anything that is not ours', () => {
    assert.equal(parseConversationId('hello'), null);
    assert.equal(parseConversationId(`kc2|${TOKEN}|yes`), null);
    assert.equal(parseConversationId(`kc1|${TOKEN}|mt|steak`), null);
    assert.equal(parseConversationId(`kc1|${TOKEN}|cnt|0`), null);
    assert.equal(parseConversationId(`kc1|short|yes`), null);
  });
});

describe('conversationStep', () => {
  it('confirms at once on "Coming" and asks how many', () => {
    const { update, reply } = step({ type: 'yes' });
    assert.equal(update?.rsvpStatus, 'confirmed');
    assert.equal(update?.amount, undefined, 'the invited amount stands');
    assert.deepEqual(offered(reply), [
      { type: 'count', count: 3 },
      { type: 'count', count: 'other' },
    ]);
  });

  it('skips the count question when the count is locked', () => {
    const { reply } = step({ type: 'yes' }, guest(), event({ lockGuestCount: true }));
    assert.deepEqual(offered(reply)[0], { type: 'mealQuestion', answer: true });
  });

  it('skips the count question for a party of one, going to the single meal list', () => {
    const { reply } = step({ type: 'yes' }, guest({ amount: 1 }));
    assert.equal(reply.kind, 'list');
    assert.deepEqual(offered(reply), [
      { type: 'mealType', meal: 'none' },
      { type: 'mealType', meal: 'vegetarian' },
      { type: 'mealType', meal: 'vegan' },
    ]);
  });

  it('goes straight to the summary when the Event has no Special Meals', () => {
    const { reply } = step({ type: 'count', count: 2 }, guest({ rsvpStatus: 'confirmed' }), event({ mealOptions: [] }));
    assert.equal(reply.kind, 'buttons');
    assert.match(reply.body, /אישרתם הגעה לחתונה של נועה ודורון/);
    assert.match(reply.body, /מספר אורחים: 2/);
    assert.doesNotMatch(reply.body, /מנות מיוחדות/);
    assert.deepEqual(offered(reply), [{ type: 'change' }]);
  });

  it('opens a 1-10 list for "different number"', () => {
    const { update, reply } = step({ type: 'count', count: 'other' }, guest({ rsvpStatus: 'confirmed' }));
    assert.equal(update, null);
    assert.equal(reply.kind, 'list');
    assert.equal(offered(reply).length, 10);
  });

  it('keeps an invited amount above ten when the shortcut is tapped', () => {
    const { update } = step({ type: 'count', count: 12 }, guest({ rsvpStatus: 'confirmed', amount: 12 }));
    assert.equal(update?.amount, 12);
  });

  it('trims meals that no longer fit when the count drops', () => {
    const { update } = step(
      { type: 'count', count: 1 },
      guest({ rsvpStatus: 'confirmed', mealCounts: { vegetarian: 1, vegan: 2 } }),
    );
    assert.deepEqual(update?.mealCounts, { vegetarian: 1 });
  });

  it('runs the type -> count -> another loop', () => {
    const confirmed = guest({ rsvpStatus: 'confirmed', amount: 3 });

    const yes = step({ type: 'mealQuestion', answer: true }, confirmed);
    assert.deepEqual(yes.update, { mealCounts: {} });
    assert.deepEqual(offered(yes.reply), [
      { type: 'mealType', meal: 'vegetarian' },
      { type: 'mealType', meal: 'vegan' },
    ]);

    const type = step({ type: 'mealType', meal: 'vegan' }, confirmed);
    assert.equal(type.update, null);
    assert.equal(offered(type.reply).length, 3, 'up to the confirmed count');

    const count = step({ type: 'mealCount', meal: 'vegan', count: 1 }, confirmed);
    assert.deepEqual(count.update, { mealCounts: { vegan: 1 } });
    assert.deepEqual(offered(count.reply), [
      { type: 'mealMore', more: true },
      { type: 'mealMore', more: false },
    ]);

    const withVegan = guest({ rsvpStatus: 'confirmed', amount: 3, mealCounts: { vegan: 1 } });
    const more = step({ type: 'mealMore', more: true }, withVegan);
    assert.deepEqual(offered(more.reply), [{ type: 'mealType', meal: 'vegetarian' }]);

    const secondType = step({ type: 'mealType', meal: 'vegetarian' }, withVegan);
    assert.equal(offered(secondType.reply).length, 2, 'only the Guests left without a meal');

    const done = step({ type: 'mealMore', more: false }, withVegan);
    assert.match(done.reply.body, /מנות מיוחדות: 1 טבעונית/);
  });

  it('ends the loop by itself once every Guest has a meal', () => {
    const { reply } = step(
      { type: 'mealCount', meal: 'vegan', count: 2 },
      guest({ rsvpStatus: 'confirmed', amount: 2 }),
    );
    assert.deepEqual(offered(reply), [{ type: 'change' }]);
  });

  it('declines and clears meals on "Not coming"', () => {
    const { update, reply } = step({ type: 'no' }, guest({ rsvpStatus: 'confirmed', mealCounts: { vegan: 1 } }));
    assert.deepEqual(update, { rsvpStatus: 'declined', mealCounts: {} });
    assert.match(reply.body, /לא תוכלו להגיע/);
  });

  it('restarts from Coming / Not coming on "change my answer"', () => {
    const { update, reply } = step({ type: 'change' }, guest({ rsvpStatus: 'declined' }));
    assert.equal(update, null);
    assert.deepEqual(offered(reply), [{ type: 'yes' }, { type: 'no' }]);
  });

  it('does not let an old question change a declined record', () => {
    const { update, reply } = step({ type: 'count', count: 4 }, guest({ rsvpStatus: 'declined' }));
    assert.equal(update, null);
    assert.deepEqual(offered(reply), [{ type: 'yes' }, { type: 'no' }]);
  });

  it('refuses every change past the RSVP Cutoff', () => {
    const { update, reply } = step({ type: 'yes' }, guest(), event({ rsvpOpen: false }));
    assert.equal(update, null);
    assert.equal(reply.kind, 'text');
  });

  it('keeps every button and row title within Meta limits', () => {
    const replies = [
      step({ type: 'yes' }).reply,
      step({ type: 'yes' }, guest({ amount: 1 }), event({ mealOptions: buildMealOptions({ dietaryOptions: true }) })).reply,
      step({ type: 'count', count: 'other' }, guest({ rsvpStatus: 'confirmed' })).reply,
      step({ type: 'mealQuestion', answer: true }, guest({ rsvpStatus: 'confirmed' }), event({ mealOptions: buildMealOptions({ dietaryOptions: true }) })).reply,
      step({ type: 'change' }).reply,
    ];
    for (const reply of replies) {
      if (reply.kind === 'buttons') {
        assert.ok(reply.buttons.length <= 3);
        for (const b of reply.buttons) assert.ok(b.title.length <= 20, b.title);
      }
      if (reply.kind === 'list') {
        assert.ok(reply.rows.length <= 10);
        for (const r of reply.rows) {
          assert.ok(r.title.length <= 24, r.title);
          assert.ok(r.id.length <= 200);
        }
      }
    }
  });
});

describe('meal counts', () => {
  it('drops unknown types and non-positive counts when reading', () => {
    assert.deepEqual(parseMealCounts({ vegan: 2, steak: 1, vegetarian: 0 }), { vegan: 2 });
    assert.deepEqual(parseMealCounts(null), {});
  });

  it('trims to the amount and to the allowed types', () => {
    assert.deepEqual(
      normalizeMealCounts({ vegan: 2, gluten_free: 2 }, { amount: 3, allowed: ['vegan', 'gluten_free'] }),
      { vegan: 2, gluten_free: 1 },
    );
    assert.deepEqual(normalizeMealCounts({ vegan: 2 }, { amount: 5, allowed: ['vegetarian'] }), {});
  });

  it('formats in vocabulary order', () => {
    assert.equal(formatMealCounts({ vegan: 1, vegetarian: 2 }), '2 צמחונית, 1 טבעונית');
  });
});

describe('isRsvpOpen', () => {
  const eventDate = '2026-10-20T00:00:00+00:00';

  it('is open until the end of the day before, Israel time', () => {
    // 23:30 Israel on the 19th (UTC+3 in October).
    assert.equal(isRsvpOpen(eventDate, new Date('2026-10-19T20:30:00Z')), true);
    // 00:30 Israel on the 20th, still the 19th in UTC.
    assert.equal(isRsvpOpen(eventDate, new Date('2026-10-19T21:30:00Z')), false);
  });

  it('has no cutoff without a date', () => {
    assert.equal(isRsvpOpen(null), true);
  });
});
