/**
 * The meal options an event can offer, and the only values that ever land in
 * `guests.meal_choice` or `events.guests_experience.dietary_types`.
 *
 * One list, in `lib` rather than in a feature, because three surfaces write
 * this column and none of them owns it: the event-details card that configures
 * which options exist, the guest drawer where a host records an answer taken by
 * phone, and the RSVP page where the guest answers for themselves. Each labels
 * these ids for its own audience - two of them through next-intl, the guest
 * page in hardcoded Hebrew - but the ids themselves have to agree.
 *
 * They did not: the drawer wrote `glatt` and `gluten-free` while the other two
 * wrote `strictly_kosher` and `gluten_free`, so a guest's own answer read back
 * as an unlabelled raw string on the guest list. Typing every label map as
 * `Record<MealChoice, string>` is what stops that from recurring - a value
 * added here fails to compile until each surface has a label for it.
 */
export const MEAL_CHOICES = [
  'vegetarian',
  'vegan',
  'gluten_free',
  'strictly_kosher',
] as const;

export type MealChoice = (typeof MEAL_CHOICES)[number];
