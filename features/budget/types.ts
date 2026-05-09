import type { ExpenseApp } from './schemas/expenses';
import type { GiftApp } from './schemas/gifts';

export type { ExpenseApp, GiftApp };

export type ExpenseStatus = 'fully-paid' | 'advance-paid' | 'advance-due' | 'not-paid';

export function getExpenseStatus(exp: ExpenseApp): ExpenseStatus {
  if (exp.fullyPaid) return 'fully-paid';
  if (exp.hasAdvance && exp.advancePaid) return 'advance-paid';
  if (exp.hasAdvance && !exp.advancePaid) return 'advance-due';
  return 'not-paid';
}

export const EXPENSE_PRESETS = [
  { key: 'rabbinateRegistration', emoji: '🏛️' },
  { key: 'weddingDress',          emoji: '👗' },
  { key: 'groomSuit',             emoji: '🤵' },
  { key: 'dj',                    emoji: '🎧' },
  { key: 'chuppahDecor',          emoji: '🌿' },
  { key: 'tableDecor',            emoji: '🌸' },
  { key: 'photographer',          emoji: '📸' },
  { key: 'videographer',          emoji: '🎬' },
  { key: 'magnetPhotographer',    emoji: '🖼️' },
  { key: 'alcohol',               emoji: '🍾' },
  { key: 'venueMeals',            emoji: '🍽️' },
  { key: 'waitersTip',            emoji: '💰' },
  { key: 'bartendersTip',         emoji: '🍹' },
  { key: 'acum',                  emoji: '🎼' },
  { key: 'rsvpService',           emoji: '📞' },
  { key: 'bridalMakeup',          emoji: '💄' },
  { key: 'bridalHair',            emoji: '💇' },
  { key: 'eventProduction',       emoji: '🎭' },
  { key: 'guestFavors',           emoji: '🎁' },
  { key: 'lightingSound',         emoji: '🔊' },
  { key: 'weddingRings',          emoji: '💍' },
  { key: 'danceFloorSparklers',   emoji: '✨' },
  { key: 'barCandy',              emoji: '🍬' },
  { key: 'carDecoration',         emoji: '🚗' },
  { key: 'bridalBouquet',         emoji: '💐' },
  { key: 'officiantRabbi',        emoji: '🕍' },
  { key: 'invitations',           emoji: '✉️' },
  { key: 'menuPrinting',          emoji: '📋' },
  { key: 'gatheringVenue',        emoji: '🏠' },
  { key: 'weddingCake',           emoji: '🎂' },
  { key: 'attractions',           emoji: '🎪' },
  { key: 'social',                emoji: '📱' },
  { key: 'transport',             emoji: '🚌' },
] as const;

export function formatCurrency(amount: number): string {
  return `₪${Number(amount).toLocaleString()}`;
}
