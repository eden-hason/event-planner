/**
 * The dietary options an event can offer, labelled the way a guest reads them.
 *
 * The keys are the values the event-details card writes into
 * `guests_experience.dietary_types`, and what `guests.meal_choice` stores, so a
 * choice made here is legible on the guest list without a lookup table.
 */
const MEAL_LABELS: Record<string, string> = {
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
  const types = guestExperience.dietaryTypes ?? Object.keys(MEAL_LABELS);
  return types.map((id) => ({ id, label: MEAL_LABELS[id] ?? id }));
}

/** The label for a stored `meal_choice`, falling back to the raw value. */
export function mealLabel(id: string): string {
  return MEAL_LABELS[id] ?? id;
}
