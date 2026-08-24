import type { MealChoice } from '@/lib/meal-choices';

/**
 * The chips offered in the guest drawer, in the order they are shown.
 *
 * The values are the shared meal vocabulary, so an answer a host records here
 * and one a guest gives on the RSVP page are the same value. `label` is only a
 * fallback for a missing translation - both the drawer and the guest table
 * label these through next-intl.
 */
export const DIETARY_PRESETS: readonly { value: MealChoice; label: string }[] = [
  { value: 'vegan', label: 'Vegan' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'strictly_kosher', label: 'Strictly Kosher' },
  { value: 'gluten_free', label: 'Gluten Free' },
];
