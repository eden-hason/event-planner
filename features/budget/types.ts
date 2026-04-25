import type { ExpenseApp } from './schemas/expenses';
import type { GiftApp } from './schemas/gifts';

export type { ExpenseApp, GiftApp };

export type ExpenseStatus = 'fully-paid' | 'advance-paid' | 'advance-due' | 'not-paid';

export function paidAmount(exp: ExpenseApp): number {
  if (exp.fullyPaid) return Number(exp.estimate);
  if (exp.hasAdvance && exp.advancePaid) return Number(exp.advanceAmount);
  return 0;
}

export function remainingAmount(exp: ExpenseApp): number {
  return Math.max(0, Number(exp.estimate) - paidAmount(exp));
}

export function getExpenseStatus(exp: ExpenseApp): ExpenseStatus {
  if (exp.fullyPaid) return 'fully-paid';
  if (exp.hasAdvance && exp.advancePaid) return 'advance-paid';
  if (exp.hasAdvance && !exp.advancePaid) return 'advance-due';
  return 'not-paid';
}

export const EXPENSE_PRESETS = [
  { key: 'rabbinateRegistration', emoji: '🏛️', estimate: 1500  },
  { key: 'weddingDress',          emoji: '👗', estimate: 8000  },
  { key: 'groomSuit',             emoji: '🤵', estimate: 3000  },
  { key: 'dj',                    emoji: '🎧', estimate: 8000  },
  { key: 'chuppahDecor',          emoji: '🌿', estimate: 4000  },
  { key: 'tableDecor',            emoji: '🌸', estimate: 6000  },
  { key: 'photographer',          emoji: '📸', estimate: 8000  },
  { key: 'videographer',          emoji: '🎬', estimate: 6000  },
  { key: 'magnetPhotographer',    emoji: '🖼️', estimate: 3000  },
  { key: 'alcohol',               emoji: '🍾', estimate: 5000  },
  { key: 'venueMeals',            emoji: '🍽️', estimate: 50000 },
  { key: 'waitersTip',            emoji: '💰', estimate: 2000  },
  { key: 'bartendersTip',         emoji: '🍹', estimate: 800   },
  { key: 'acum',                  emoji: '🎼', estimate: 1000  },
  { key: 'rsvpService',           emoji: '📞', estimate: 1500  },
  { key: 'bridalMakeup',          emoji: '💄', estimate: 2000  },
  { key: 'bridalHair',            emoji: '💇', estimate: 1500  },
  { key: 'eventProduction',       emoji: '🎭', estimate: 8000  },
  { key: 'guestFavors',           emoji: '🎁', estimate: 3000  },
  { key: 'lightingSound',         emoji: '🔊', estimate: 8000  },
  { key: 'weddingRings',          emoji: '💍', estimate: 10000 },
  { key: 'danceFloorSparklers',   emoji: '✨', estimate: 2000  },
  { key: 'barCandy',              emoji: '🍬', estimate: 1500  },
  { key: 'carDecoration',         emoji: '🚗', estimate: 600   },
  { key: 'bridalBouquet',         emoji: '💐', estimate: 1500  },
  { key: 'officiantRabbi',        emoji: '🕍', estimate: 3000  },
  { key: 'invitations',           emoji: '✉️', estimate: 2500  },
  { key: 'weddingCake',           emoji: '🎂', estimate: 2500  },
  { key: 'attractions',           emoji: '🎪', estimate: 5000  },
] as const;

export function formatCurrency(amount: number): string {
  return `₪${Number(amount).toLocaleString()}`;
}
