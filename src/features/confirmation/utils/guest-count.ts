/**
 * Reads a Guest count out of text a Guest typed in answer to "how many are
 * coming?" - the one question in a Confirmation Conversation answered by typing
 * rather than tapping (ADR 0023).
 *
 * Forgiving about what surrounds the number and strict about ambiguity: "3",
 * "3 אנשים", "אנחנו 4", "שלושה" and "٣" all read as one number, while "2 או 3",
 * "2-3" and "2+1" do not - a guess there would record a count the Guest never
 * gave, and asking again costs one message.
 */

export type ParsedGuestCount =
  | { kind: 'count'; count: number }
  /** "0" or "אפס" - really a "Not coming", answered as one. */
  | { kind: 'zero' }
  | { kind: 'invalid' };

/** Arabic-Indic and Extended Arabic-Indic digits, which some keyboards type. */
const FOREIGN_DIGITS = /[٠-٩۰-۹]/g;

function toAsciiDigits(text: string): string {
  return text.replace(FOREIGN_DIGITS, (d) => {
    const code = d.charCodeAt(0);
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  });
}

/**
 * Hebrew number words for the counts a party usually is, both genders. Matched
 * as whole words, optionally after a one-letter prefix ("ושלושה", "בשניים").
 */
const NUMBER_WORDS: Record<string, number> = {
  אפס: 0,
  אחד: 1,
  אחת: 1,
  לבד: 1,
  שניים: 2,
  שנים: 2,
  שתיים: 2,
  שתים: 2,
  זוג: 2,
  שלוש: 3,
  שלושה: 3,
  ארבע: 4,
  ארבעה: 4,
  חמש: 5,
  חמישה: 5,
  שש: 6,
  שישה: 6,
  שבע: 7,
  שבעה: 7,
  שמונה: 8,
  תשע: 9,
  תשעה: 9,
  עשר: 10,
  עשרה: 10,
};

const PREFIXES = ['ו', 'ב', 'ה'];

function wordValue(word: string): number | undefined {
  if (word in NUMBER_WORDS) return NUMBER_WORDS[word];
  const first = word[0];
  if (PREFIXES.includes(first) && word.slice(1) in NUMBER_WORDS) {
    return NUMBER_WORDS[word.slice(1)];
  }
  return undefined;
}

export function parseGuestCount(text: string): ParsedGuestCount {
  const normalized = toAsciiDigits(text).trim();

  // Every run of digits is a number the Guest wrote. More than one - "2 או 3",
  // "2-3", "3.5" - is ambiguous, whatever sits between them.
  const digitRuns = normalized.match(/\d+/g) ?? [];
  const words = normalized
    .split(/[^\p{L}]+/u)
    .map(wordValue)
    .filter((n): n is number => n !== undefined);

  const numbers = [...digitRuns.map(Number), ...words];
  if (numbers.length !== 1) return { kind: 'invalid' };

  const [n] = numbers;
  if (!Number.isSafeInteger(n)) return { kind: 'invalid' };
  if (n === 0) return { kind: 'zero' };
  return { kind: 'count', count: n };
}
