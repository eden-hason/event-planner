export const DIETARY_PRESETS = [
  { value: 'vegan', label: 'Vegan' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'glatt', label: 'Glatt' },
  { value: 'gluten-free', label: 'Gluten Free' },
] as const;

export const DIETARY_LABEL_MAP = Object.fromEntries(
  DIETARY_PRESETS.map(({ value, label }) => [value, label]),
) as Record<string, string>;
