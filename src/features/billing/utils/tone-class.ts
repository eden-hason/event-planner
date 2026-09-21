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

/**
 * The upsell surface: a fixed dark plum gradient, deliberately the same in both
 * themes, with white text. Shared by every "upgrade to Premium" card so they
 * read as one offer - the More page's plan card and the schedules timeline's
 * upsell banner.
 */
export const UPSELL_SURFACE_CLASS =
  'bg-linear-150 from-[#2B0F3A] via-[#4A1247] via-70% to-[#6A1258] text-white shadow-[0_12px_28px_rgba(42,12,58,0.28)]';

/** The upsell's call to action: white, lettered in the surface's darkest stop. */
export const UPSELL_CTA_CLASS = 'bg-white text-[#2B0F3A]';
