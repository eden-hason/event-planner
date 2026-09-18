import { MEAL_CHOICES, type MealChoice } from '@/lib/meal-choices';
import { mealLabel } from './meal-options';

/**
 * Special Meals within one Guest Record, counted per type (see Special Meal in
 * CONTEXT.md): `{ vegan: 1, gluten_free: 2 }`. An empty map means none.
 *
 * Stored in `guests.meal_counts`. The database checks only the shape; the two
 * rules that depend on the rest of the record - the total never exceeds the
 * number of Guests, and only types the Event switched on are kept - live in
 * `normalizeMealCounts`, which every writer runs.
 */
export type MealCounts = Partial<Record<MealChoice, number>>;

function isMealChoice(value: string): value is MealChoice {
  return (MEAL_CHOICES as readonly string[]).includes(value);
}

/** Reads a stored value defensively: unknown ids and non-positive counts are dropped. */
export function parseMealCounts(value: unknown): MealCounts {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const counts: MealCounts = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (isMealChoice(key) && Number.isInteger(n) && n >= 1) counts[key] = n;
  }
  return counts;
}

export function totalMeals(counts: MealCounts): number {
  return Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0);
}

/**
 * Makes a map safe to store against a record of `amount` Guests.
 *
 * Types the Event does not offer are dropped. When the total is over `amount` -
 * a host lowered the count, or a guest confirmed fewer people than meals already
 * recorded - counts are trimmed from the end of the shared vocabulary's order,
 * so the result is deterministic rather than dependent on key order in jsonb.
 */
export function normalizeMealCounts(
  counts: MealCounts,
  options: { amount: number; allowed?: readonly string[] },
): MealCounts {
  const allowed = options.allowed ? new Set(options.allowed) : null;
  let budget = Math.max(0, options.amount);
  const out: MealCounts = {};
  for (const type of MEAL_CHOICES) {
    const n = counts[type];
    if (!n || n < 1) continue;
    if (allowed && !allowed.has(type)) continue;
    const kept = Math.min(n, budget);
    if (kept > 0) out[type] = kept;
    budget -= kept;
  }
  return out;
}

/** "1 טבעונית, 2 ללא גלוטן" - the guest-facing summary, in vocabulary order. */
export function formatMealCounts(counts: MealCounts): string {
  return MEAL_CHOICES.filter((type) => counts[type])
    .map((type) => `${counts[type]} ${mealLabel(type)}`)
    .join(', ');
}
