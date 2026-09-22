'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * What a section says about itself in one word: whether the thing a Guest needs
 * is there. `pending` is a write in flight, `error` one that failed - both are
 * about the upload, which is the only control here that can be busy or broken
 * on its own.
 */
export type SectionStatusTone = 'ready' | 'missing' | 'pending' | 'error';

// Tint + strong pairs, so the chip text clears 4.5:1 on its own surface.
const TONE_CLASSES: Record<SectionStatusTone, string> = {
  ready: 'bg-rsvp-confirmed-tint text-rsvp-confirmed-strong',
  missing: 'bg-warning-tint text-warning-ink',
  pending: 'bg-info-tint text-info-strong',
  error: 'bg-destructive/15 text-destructive',
};

export function SectionStatus({
  tone,
  label,
  icon,
  className,
}: {
  tone: SectionStatusTone;
  label: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold lg:px-2.5 lg:text-[11.5px]',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {icon}
      {label}
    </span>
  );
}

/**
 * The shell every section of the details page shares: an icon, a title, the
 * section's own status, and the fields.
 *
 * `id` is the anchor the readiness summary scrolls to, so it belongs on the
 * outer element rather than on the heading.
 */
export function SectionCard({
  id,
  icon,
  title,
  description,
  status,
  className,
  contentClassName,
  children,
}: {
  id?: string;
  icon?: React.ReactNode;
  title: string;
  description?: string;
  status?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
}) {
  const titleId = id ? `${id}-title` : undefined;

  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className={cn(
        'bg-card text-card-foreground flex scroll-mt-20 flex-col gap-3 rounded-[18px] border p-3.5 lg:gap-3.5 lg:p-[18px]',
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <h2
            id={titleId}
            className="flex items-center gap-2 text-[15px] font-bold lg:text-base [&_svg]:size-[17px] [&_svg]:shrink-0 lg:[&_svg]:size-[18px]"
          >
            {icon}
            {title}
          </h2>
          {status}
        </div>
        {description && (
          <p className="text-muted-foreground text-xs leading-relaxed lg:text-[12.5px]">
            {description}
          </p>
        )}
      </div>
      <div className={contentClassName}>{children}</div>
    </section>
  );
}

/**
 * The look of a single-line field on this page - a 36px box with the value at
 * the start and its icon at the end - shared by the date, time and venue
 * controls so a filled field reads the same whichever widget sits behind it.
 */
export const FIELD_BOX_CLASSES =
  'border-input bg-background flex h-9 w-full items-center justify-between gap-2 rounded-xl border px-3 text-sm font-semibold lg:rounded-[11px]';
