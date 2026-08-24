import { MEAL_CHOICES, type MealChoice } from '@/lib/meal-choices';

/**
 * The shared meal vocabulary, labelled the way a guest reads it - feminine, to
 * agree with מנה, where the host-facing chips agree with the guest instead.
 */
const MEAL_LABELS: Record<MealChoice, string> = {
  vegetarian: 'צמחונית',
  vegan: 'טבעונית',
  gluten_free: 'ללא גלוטן',
  strictly_kosher: 'כשר למהדרין',
};

export type MealOption = {
  id: string;
  label: string;
};

type GuestExperience =
  | { dietaryOptions?: boolean; dietaryTypes?: string[] }
  | null
  | undefined;

/**
 * What the meal question offers, in the order the host configured.
 *
 * Empty when the event has special meals switched off, which is what drops the
 * question from the form rather than showing it with nothing to pick.
 * Switched on without an explicit list means all of them - the same default the
 * event-details card starts from.
 */
export function buildMealOptions(guestExperience: GuestExperience): MealOption[] {
  if (!guestExperience?.dietaryOptions) return [];
  const types = guestExperience.dietaryTypes ?? MEAL_CHOICES;
  return types.map((id) => ({ id, label: mealLabel(id) }));
}

/** The label for a stored `meal_choice`, falling back to the raw value. */
export function mealLabel(id: string): string {
  return MEAL_LABELS[id as MealChoice] ?? id;
}
