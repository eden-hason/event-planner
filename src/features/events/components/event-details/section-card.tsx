'use client';

import * as React from 'react';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * What a section says about itself in one word: whether the thing a Guest needs
 * is there. `pending` is a write in flight, `error` one that failed - both are
 * about the upload, which is the only control here that can be busy or broken
 * on its own.
 */
export type SectionStatusTone = 'ready' | 'missing' | 'pending' | 'error';

const TONE_CLASSES: Record<SectionStatusTone, string> = {
  ready: 'border-success/20 bg-success/10 text-success',
  missing: 'border-warning/20 bg-warning/10 text-warning',
  pending: 'border-primary/20 bg-primary/5 text-primary',
  error: 'border-destructive/20 bg-destructive/10 text-destructive',
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
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold',
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
  return (
    <Card id={id} className={cn('gap-4 py-5 scroll-mt-20', className)}>
      <CardHeader className="gap-1 px-4 sm:px-5">
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle className="text-base font-bold">{title}</CardTitle>
        </div>
        {description && (
          <p className="text-muted-foreground text-xs leading-relaxed">
            {description}
          </p>
        )}
        {status && <CardAction className="self-center">{status}</CardAction>}
      </CardHeader>
      <CardContent className={cn('px-4 sm:px-5', contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
