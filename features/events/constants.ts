export const PLAN_CAPACITY = {
  tier_100: 100,
  tier_200: 200,
  tier_300: 300,
  tier_400: 400,
} as const;

export type PricingPlanId = keyof typeof PLAN_CAPACITY;
