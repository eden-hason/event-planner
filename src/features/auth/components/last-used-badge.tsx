'use client';

import { useTranslations } from 'next-intl';

/**
 * Marks the Last-used Method's button, on its top edge. Its parent must be
 * `relative`. It points, it does not reorder: the buttons stay where they are on
 * every device, so the screen is the same one people remember.
 */
export function LastUsedBadge() {
  const t = useTranslations('auth');
  return (
    <span className="pointer-events-none absolute -top-2.5 end-4 rounded-full border border-[var(--kt-brand)] bg-[var(--kt-surface)] px-2.5 text-[11.5px] leading-[18px] font-semibold text-[var(--kt-brand-text)]">
      {t('lastUsed')}
    </span>
  );
}
