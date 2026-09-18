import { MEAL_CHOICES, type MealChoice } from '@/lib/meal-choices';

/**
 * The hidden id carried by every button and list option in a Confirmation
 * Conversation - including the two quick replies on the template itself.
 *
 * Replies identify themselves (ADR 0017): the id holds the Delivery's
 * confirmation token and the answer, so a tap is handled on its own with no
 * stored notion of where the Guest is in the conversation. An old summary tapped
 * weeks later, two Events on one phone, taps arriving out of order - none of it
 * needs a special case.
 *
 * Shape: `kc1|<token>|<action>[|<arg>][|<amount>]`
 *
 *   - `kc1` versions the format, so a later change can still read ids already
 *     sitting in Guests' chats.
 *   - `<token>` is a Delivery's confirmation token, or an Event's preview token
 *     for a Test Message (see isPreviewToken in the conversation service).
 *   - `<amount>` is the Guest count the question was asked for. A real Guest's
 *     count is read from their record and this is ignored; it exists for the
 *     Test Message dry run, which writes nothing and so has nowhere else to
 *     remember it.
 *
 * Meta caps a button id at 256 characters and a list row id at 200; the longest
 * id here is well under 100.
 */

const PREFIX = 'kc1';
const SEP = '|';

export type ConversationAction =
  /** Coming. From the template's quick reply or a "change my answer" restart. */
  | { type: 'yes' }
  /** Not coming. */
  | { type: 'no' }
  /** Change my answer - restarts from Coming / Not coming. */
  | { type: 'change' }
  /** How many are coming: a number, or "other" to open the 1-10 list. */
  | { type: 'count'; count: number | 'other' }
  /** "Does anyone need a special meal?" */
  | { type: 'mealQuestion'; answer: boolean }
  /** A meal type was picked, or "none" (the single-guest list offers it). */
  | { type: 'mealType'; meal: MealChoice | 'none' }
  /** How many of one meal type. */
  | { type: 'mealCount'; meal: MealChoice; count: number }
  /** After a meal count: add another type, or finish. */
  | { type: 'mealMore'; more: boolean };

export type ParsedConversationId = {
  token: string;
  action: ConversationAction;
  /** The count the question was asked for - see the module comment. */
  amount: number | null;
};

function isMealChoice(value: string): value is MealChoice {
  return (MEAL_CHOICES as readonly string[]).includes(value);
}

function positiveInt(value: string | undefined): number | null {
  if (!value || !/^\d{1,3}$/.test(value)) return null;
  const n = Number(value);
  return n >= 1 ? n : null;
}

function encodeAction(action: ConversationAction): string[] {
  switch (action.type) {
    case 'yes':
      return ['yes'];
    case 'no':
      return ['no'];
    case 'change':
      return ['chg'];
    case 'count':
      return ['cnt', String(action.count)];
    case 'mealQuestion':
      return ['mq', action.answer ? 'y' : 'n'];
    case 'mealType':
      return ['mt', action.meal];
    case 'mealCount':
      return ['mc', `${action.meal}:${action.count}`];
    case 'mealMore':
      return ['mm', action.more ? 'y' : 'n'];
  }
}

export function encodeConversationId(
  token: string,
  action: ConversationAction,
  amount?: number | null,
): string {
  const parts = [PREFIX, token, ...encodeAction(action)];
  // Only actions that take an arg carry an amount after it; yes/no/change are
  // kept to the bare three parts, the shape the template's quick replies use.
  if (amount && parts.length > 3) parts.push(String(amount));
  return parts.join(SEP);
}

function decodeAction(name: string | undefined, arg: string | undefined): ConversationAction | null {
  switch (name) {
    case 'yes':
      return { type: 'yes' };
    case 'no':
      return { type: 'no' };
    case 'chg':
      return { type: 'change' };
    case 'cnt': {
      if (arg === 'other') return { type: 'count', count: 'other' };
      const n = positiveInt(arg);
      return n ? { type: 'count', count: n } : null;
    }
    case 'mq':
      return arg === 'y' || arg === 'n' ? { type: 'mealQuestion', answer: arg === 'y' } : null;
    case 'mt':
      if (arg === 'none') return { type: 'mealType', meal: 'none' };
      return arg && isMealChoice(arg) ? { type: 'mealType', meal: arg } : null;
    case 'mc': {
      const [meal, count] = (arg ?? '').split(':');
      const n = positiveInt(count);
      return isMealChoice(meal) && n ? { type: 'mealCount', meal, count: n } : null;
    }
    case 'mm':
      return arg === 'y' || arg === 'n' ? { type: 'mealMore', more: arg === 'y' } : null;
    default:
      return null;
  }
}

/** Null for anything that is not one of ours - another bot's payload, a typo'd test. */
export function parseConversationId(id: string | null | undefined): ParsedConversationId | null {
  if (!id) return null;
  const parts = id.split(SEP);
  if (parts[0] !== PREFIX || parts.length < 3) return null;

  const token = parts[1];
  if (!/^[A-Za-z0-9-]{12,64}$/.test(token)) return null;

  const action = decodeAction(parts[2], parts[3]);
  if (!action) return null;

  return { token, action, amount: positiveInt(parts[4]) };
}

/** The quick-reply payloads the template's buttons carry, rendered at dispatch. */
export function rsvpYesPayload(token: string): string {
  return encodeConversationId(token, { type: 'yes' });
}

export function rsvpNoPayload(token: string): string {
  return encodeConversationId(token, { type: 'no' });
}
