import type { MealChoice } from '@/lib/meal-choices';
import {
  encodeConversationId,
  type ConversationAction,
} from './conversation-ids';
import { mealLabel, type MealOption } from './meal-options';
import {
  formatMealCounts,
  normalizeMealCounts,
  totalMeals,
  type MealCounts,
} from './meal-counts';
import { RSVP_CLOSED_MESSAGE } from './rsvp-cutoff';

/**
 * The Confirmation Conversation as a pure function: one tap in, at most one
 * change to the RSVP and exactly one message out.
 *
 * No I/O and no stored conversation state - everything a step needs is either
 * on the Guest Record or inside the tapped id (ADR 0017). The service around it
 * loads the record, applies `update`, and sends `reply`.
 *
 * Every answer counts the moment it is given: "Coming" confirms at once with the
 * invited amount, and each later answer refines the record. A Guest who stops
 * halfway is still correctly confirmed.
 */

export type ConversationGuest = {
  rsvpStatus: 'pending' | 'confirmed' | 'declined';
  amount: number;
  mealCounts: MealCounts;
};

export type ConversationEvent = {
  /** "חתונה של נועה ודורון" - see Occasion Phrase in CONTEXT.md. Null when it cannot be built. */
  occasionPhrase: string | null;
  lockGuestCount: boolean;
  /** Empty when the Event has Special Meals switched off. */
  mealOptions: MealOption[];
  /** False past the RSVP Cutoff. */
  rsvpOpen: boolean;
  /** The Guest's RSVP page, offered in the summary. */
  rsvpUrl: string;
};

export type RsvpUpdate = {
  rsvpStatus?: 'confirmed' | 'declined';
  amount?: number;
  mealCounts?: MealCounts;
};

export type ReplyButton = { id: string; title: string };

/**
 * One outbound session message. Meta's limits shape these: at most three reply
 * buttons with titles of 20 characters, at most ten list rows with titles of 24.
 */
export type OutgoingMessage =
  | { kind: 'text'; body: string }
  | { kind: 'buttons'; body: string; buttons: ReplyButton[] }
  | { kind: 'list'; body: string; buttonLabel: string; rows: ReplyButton[] };

export type ConversationStep = {
  update: RsvpUpdate | null;
  reply: OutgoingMessage;
};

/** WhatsApp's list-message ceiling, and so the largest count offered in the chat. */
export const MAX_LIST_ROWS = 10;

/** A sanity ceiling on a count arriving in an id, not a product limit. */
const MAX_COUNT = 99;

type Ctx = {
  token: string;
  guest: ConversationGuest;
  event: ConversationEvent;
};

function id(ctx: Ctx, action: ConversationAction): string {
  return encodeConversationId(ctx.token, action, ctx.guest.amount);
}

function applyUpdate(guest: ConversationGuest, update: RsvpUpdate | null): ConversationGuest {
  if (!update) return guest;
  return {
    rsvpStatus: update.rsvpStatus ?? guest.rsvpStatus,
    amount: update.amount ?? guest.amount,
    mealCounts: update.mealCounts ?? guest.mealCounts,
  };
}

// --- Questions --------------------------------------------------------------

function askComing(ctx: Ctx, body: string): OutgoingMessage {
  return {
    kind: 'buttons',
    body,
    buttons: [
      { id: id(ctx, { type: 'yes' }), title: 'נגיע בשמחה' },
      { id: id(ctx, { type: 'no' }), title: 'לא נוכל להגיע' },
    ],
  };
}

function askCount(ctx: Ctx): OutgoingMessage {
  const { amount } = ctx.guest;
  return {
    kind: 'buttons',
    body: 'איזה כיף! 🎉\nכמה תגיעו בסך הכול?',
    buttons: [
      { id: id(ctx, { type: 'count', count: amount }), title: `נגיע ${amount}` },
      { id: id(ctx, { type: 'count', count: 'other' }), title: 'מספר אחר' },
    ],
  };
}

function askCountList(ctx: Ctx): OutgoingMessage {
  return {
    kind: 'list',
    body: `כמה תגיעו בסך הכול?\n\nיותר מ-${MAX_LIST_ROWS}? אפשר לעדכן באתר:\n${ctx.event.rsvpUrl}`,
    buttonLabel: 'בחירת מספר',
    rows: Array.from({ length: MAX_LIST_ROWS }, (_, i) => ({
      id: id(ctx, { type: 'count', count: i + 1 }),
      title: String(i + 1),
    })),
  };
}

/** The meal step, or the summary when the Event offers no Special Meals. */
function mealStepOrSummary(ctx: Ctx): OutgoingMessage {
  const options = ctx.event.mealOptions;
  if (options.length === 0) return summary(ctx);

  if (ctx.guest.amount === 1) {
    return {
      kind: 'list',
      body: 'צריך מנה מיוחדת?',
      buttonLabel: 'בחירת מנה',
      rows: [
        { id: id(ctx, { type: 'mealType', meal: 'none' }), title: 'ללא מנה מיוחדת' },
        ...options.map((option) => ({
          id: id(ctx, { type: 'mealType', meal: option.id as MealChoice }),
          title: option.label,
        })),
      ],
    };
  }

  return {
    kind: 'buttons',
    body: 'האם מישהו מכם צריך מנה מיוחדת?',
    buttons: [
      { id: id(ctx, { type: 'mealQuestion', answer: true }), title: 'כן' },
      { id: id(ctx, { type: 'mealQuestion', answer: false }), title: 'לא, תודה' },
    ],
  };
}

/** Types not yet counted - a type is asked about once per pass through the loop. */
function remainingTypes(ctx: Ctx): MealOption[] {
  return ctx.event.mealOptions.filter(
    (option) => !ctx.guest.mealCounts[option.id as MealChoice],
  );
}

function askMealType(ctx: Ctx): OutgoingMessage {
  const types = remainingTypes(ctx);
  if (types.length === 0) return summary(ctx);
  return {
    kind: 'list',
    body: 'איזו מנה מיוחדת?',
    buttonLabel: 'בחירת מנה',
    rows: types.map((option) => ({
      id: id(ctx, { type: 'mealType', meal: option.id as MealChoice }),
      title: option.label,
    })),
  };
}

function mealsLeft(ctx: Ctx, excluding?: MealChoice): number {
  const counted = { ...ctx.guest.mealCounts };
  if (excluding) delete counted[excluding];
  return ctx.guest.amount - totalMeals(counted);
}

function askMealCount(ctx: Ctx, meal: MealChoice): OutgoingMessage {
  const max = Math.min(mealsLeft(ctx, meal), MAX_LIST_ROWS);
  return {
    kind: 'list',
    body: `כמה מנות ${mealLabel(meal)}?`,
    buttonLabel: 'בחירת מספר',
    rows: Array.from({ length: Math.max(max, 1) }, (_, i) => ({
      id: id(ctx, { type: 'mealCount', meal, count: i + 1 }),
      title: String(i + 1),
    })),
  };
}

function askMoreMeals(ctx: Ctx): OutgoingMessage {
  if (mealsLeft(ctx) <= 0 || remainingTypes(ctx).length === 0) return summary(ctx);
  return {
    kind: 'buttons',
    body: `רשמנו: ${formatMealCounts(ctx.guest.mealCounts)}.\nצריך עוד סוג של מנה מיוחדת?`,
    buttons: [
      { id: id(ctx, { type: 'mealMore', more: true }), title: 'מנה נוספת' },
      { id: id(ctx, { type: 'mealMore', more: false }), title: 'זהו, סיימנו' },
    ],
  };
}

function summary(ctx: Ctx): OutgoingMessage {
  const { guest, event } = ctx;
  const change = { id: id(ctx, { type: 'change' }), title: 'שינוי התשובה' };
  const footer = `אפשר לעדכן עד יום לפני האירוע, כאן או באתר:\n${event.rsvpUrl}`;

  if (guest.rsvpStatus === 'declined') {
    return {
      kind: 'buttons',
      body: `תודה שעדכנתם 🙏🏼\nרשמנו שלא תוכלו להגיע.\n\n${footer}`,
      buttons: [change],
    };
  }

  const lines = [
    event.occasionPhrase
      ? `תודה! אישרתם הגעה ל${event.occasionPhrase} 🎉`
      : 'תודה! אישרתם הגעה 🎉',
    '',
    `מספר אורחים: ${guest.amount}`,
  ];
  if (event.mealOptions.length > 0) {
    const meals = formatMealCounts(guest.mealCounts);
    lines.push(`מנות מיוחדות: ${meals || 'ללא'}`);
  }
  lines.push('', footer);

  return { kind: 'buttons', body: lines.join('\n'), buttons: [change] };
}

// --- The step ---------------------------------------------------------------

/**
 * Handles one tap. `guest` is the record as it stands before the tap.
 */
export function conversationStep(params: {
  token: string;
  action: ConversationAction;
  guest: ConversationGuest;
  event: ConversationEvent;
}): ConversationStep {
  const { token, action, event } = params;
  const before: Ctx = { token, guest: params.guest, event };

  if (!event.rsvpOpen) {
    return { update: null, reply: { kind: 'text', body: RSVP_CLOSED_MESSAGE } };
  }

  const allowed = event.mealOptions.map((option) => option.id);

  const respond = (update: RsvpUpdate | null, next: (ctx: Ctx) => OutgoingMessage): ConversationStep => {
    const ctx: Ctx = { ...before, guest: applyUpdate(before.guest, update) };
    return { update, reply: next(ctx) };
  };

  switch (action.type) {
    case 'yes': {
      const update: RsvpUpdate = {
        rsvpStatus: 'confirmed',
        mealCounts: normalizeMealCounts(before.guest.mealCounts, {
          amount: before.guest.amount,
          allowed,
        }),
      };
      const askAmount = !event.lockGuestCount && before.guest.amount > 1;
      return respond(update, askAmount ? askCount : mealStepOrSummary);
    }

    case 'no':
      return respond({ rsvpStatus: 'declined', mealCounts: {} }, summary);

    case 'change':
      return respond(null, (ctx) => askComing(ctx, 'בשמחה! מה התשובה המעודכנת?'));
  }

  // Everything below refines a "Coming". A tap on an old question after the
  // Guest has since declined must not quietly change a declined record, so it
  // asks again instead.
  if (before.guest.rsvpStatus !== 'confirmed') {
    const body =
      before.guest.rsvpStatus === 'declined'
        ? 'כרגע רשום אצלנו שלא תוכלו להגיע. רוצים לעדכן?'
        : 'נשמח לדעת אם תגיעו';
    return respond(null, (ctx) => askComing(ctx, body));
  }

  switch (action.type) {
    case 'count': {
      if (event.lockGuestCount) return respond(null, mealStepOrSummary);
      if (action.count === 'other') return respond(null, askCountList);
      // The shortcut button offers the invited amount, which may be above the
      // list's ten, so only an absurd number is capped.
      const amount = Math.min(action.count, MAX_COUNT);
      return respond(
        {
          amount,
          // A lower count can leave more meals than people. Trimmed rather than
          // cleared, and the meal question follows straight after anyway.
          mealCounts: normalizeMealCounts(before.guest.mealCounts, { amount, allowed }),
        },
        mealStepOrSummary,
      );
    }

    case 'mealQuestion':
      // Both answers start the meal list from scratch: "yes" is the beginning
      // of a fresh count, not an addition to whatever an earlier pass left.
      return respond({ mealCounts: {} }, action.answer ? askMealType : summary);

    case 'mealType': {
      if (action.meal === 'none') return respond({ mealCounts: {} }, summary);
      if (!allowed.includes(action.meal)) return respond(null, mealStepOrSummary);
      if (before.guest.amount === 1) {
        return respond({ mealCounts: { [action.meal]: 1 } }, summary);
      }
      const meal = action.meal;
      return respond(null, (ctx) => askMealCount(ctx, meal));
    }

    case 'mealCount': {
      if (!allowed.includes(action.meal)) return respond(null, mealStepOrSummary);
      const mealCounts = normalizeMealCounts(
        { ...before.guest.mealCounts, [action.meal]: action.count },
        { amount: before.guest.amount, allowed },
      );
      return respond({ mealCounts }, askMoreMeals);
    }

    case 'mealMore':
      return respond(null, action.more ? askMealType : summary);
  }
}

/**
 * The fixed answer to text a Guest types instead of tapping. Typed text is not
 * interpreted or passed to the hosts (ADR 0017), so the answer only points back to the buttons.
 */
export const TYPED_TEXT_REPLY =
  'כדי לאשר או לעדכן הגעה, לחצו על אחד הכפתורים בהודעה שקיבלתם 🙏🏼';
