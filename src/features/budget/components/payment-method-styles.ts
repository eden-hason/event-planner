import type { GiftSegmentKey } from '../utils/gift-summary';

/** Badge colors for a payment method in the gifts table and the phone list. */
export const PAYMENT_METHOD_BADGE: Record<GiftSegmentKey, string> = {
  cash: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  bit: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20',
  paybox: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
  check: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  other: 'bg-muted text-muted-foreground border-border',
  none: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20',
};

/**
 * Fill for a method's share of the hero's split bar and its legend dot. A gift
 * with no method yet is hatched, so it reads as "still to sort" rather than as
 * one more method.
 */
export const PAYMENT_METHOD_FILL: Record<GiftSegmentKey, string> = {
  cash: 'bg-orange-500',
  bit: 'bg-teal-500',
  paybox: 'bg-violet-500',
  check: 'bg-blue-500',
  other: 'bg-slate-400',
  none:
    'bg-[repeating-linear-gradient(135deg,#94a3b8_0_3px,#d5dce6_3px_6px)] dark:bg-[repeating-linear-gradient(135deg,#7c8799_0_3px,#3e4552_3px_6px)]',
};
