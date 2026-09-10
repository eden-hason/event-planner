import { cn } from '@/lib/utils';
import type { BillingPillTone } from '../types';

/**
 * How a billing tone looks. Shared because two surfaces render it - the header
 * pill and the mobile plan card - and they used to disagree: the pill's
 * "premium" was gold, the plan card's was emerald.
 *
 * Gold is deliberate brand, not a severity, so it stays a palette choice rather
 * than borrowing --warning.
 */
export const BILLING_TONE_CLASS: Record<BillingPillTone, string> = {
  premium: cn(
    'border-amber-300/80 bg-amber-50 text-amber-800',
    'dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200',
  ),
  plain: 'border-border bg-transparent text-muted-foreground',
  pending: 'border-border bg-muted text-muted-foreground',
};
