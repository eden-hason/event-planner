'use client';

import { Children, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

/** How many group rows an analytics card shows before the "show all" toggle. */
export const GROUP_ROWS_VISIBLE = 5;

/**
 * Caps a server-rendered row list at `cap` and appends a toggle that expands
 * it in place. The rows arrive as children already rendered on the server, so
 * expanding costs no extra fetch - only the toggle itself is client-side.
 */
export function CollapsibleRows({
  children,
  cap = GROUP_ROWS_VISIBLE,
  className,
  buttonClassName,
}: {
  children: ReactNode;
  cap?: number;
  /** Applied to the wrapper around the rows, so the card keeps its own spacing. */
  className?: string;
  buttonClassName?: string;
}) {
  const t = useTranslations('home.mobile.analytics');
  const [expanded, setExpanded] = useState(false);

  const rows = Children.toArray(children);
  const collapsible = rows.length > cap;

  return (
    <>
      <div className={className}>{collapsible && !expanded ? rows.slice(0, cap) : rows}</div>
      {collapsible && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className={cn('text-primary text-[13px] font-semibold', buttonClassName)}
        >
          {expanded ? t('groupsShowLess') : t('groupsShowAll', { count: rows.length })}
        </button>
      )}
    </>
  );
}
