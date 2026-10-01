'use client';

import type { ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconX,
} from '@tabler/icons-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

/**
 * The bottom sheet every phone guest-list action opens in (Guests Mobile
 * design): a grab handle, a title with an optional muted line under it, a
 * close button, then the body.
 */
export function MobileSheet({
  open,
  onOpenChange,
  title,
  subtitle,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  const t = useTranslations('guests.list.mobile');
  const dir = useLocale() === 'he' ? 'rtl' : 'ltr';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        dir={dir}
        // A sheet of options, not a form: focusing the first one would only
        // paint a ring on it.
        onOpenAutoFocus={(event) => event.preventDefault()}
        className={cn(
          'flex max-h-[90dvh] flex-col gap-3.5 rounded-t-[24px] border-0 px-4 pt-2 pb-[max(1.75rem,env(safe-area-inset-bottom))] [&>[data-slot=sheet-close]]:hidden',
          className,
        )}
      >
        <span className="bg-input h-1 w-[38px] shrink-0 self-center rounded-full" />
        <div className="flex items-start gap-2.5">
          <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
            <SheetTitle className="text-lg leading-snug font-extrabold">
              {title}
            </SheetTitle>
            <SheetDescription
              className={cn('text-[13px]', !subtitle && 'sr-only')}
            >
              {subtitle || title}
            </SheetDescription>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label={t('close')}
            className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-[9px]"
          >
            <IconX size={16} stroke={2.2} />
          </button>
        </div>
        <div className="-mx-4 flex min-h-0 flex-col gap-3.5 overflow-y-auto px-4">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** One tappable line in a sheet's option list. */
export function SheetOption({
  label,
  sub,
  icon,
  dotClass,
  destructive,
  separated,
  checked,
  chevron,
  disabled,
  bold,
  onClick,
}: {
  label: string;
  sub?: string;
  icon?: ReactNode;
  /** A status or side dot instead of an icon tile. */
  dotClass?: string;
  destructive?: boolean;
  /** A hairline above it, setting it apart from the options before. */
  separated?: boolean;
  checked?: boolean;
  chevron?: boolean;
  disabled?: boolean;
  bold?: boolean;
  onClick: () => void;
}) {
  const isRTL = useLocale() === 'he';
  const Chevron = isRTL ? IconChevronLeft : IconChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex min-h-[50px] w-full items-center gap-3 text-start disabled:opacity-45',
        separated && 'border-t',
        destructive ? 'text-destructive' : 'text-foreground',
      )}
    >
      {icon && (
        <span
          className={cn(
            'flex size-[34px] shrink-0 items-center justify-center rounded-[10px]',
            destructive ? 'bg-destructive/10' : 'bg-muted',
          )}
        >
          {icon}
        </span>
      )}
      {dotClass && (
        <span className={cn('mx-1 size-2.5 shrink-0 rounded-full', dotClass)} />
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <span
          className={cn(
            'truncate text-[15px]',
            bold ? 'font-semibold' : 'font-medium',
          )}
        >
          {label}
        </span>
        {sub && (
          <span className="text-muted-foreground text-[12.5px]">{sub}</span>
        )}
      </span>
      {checked && (
        <IconCheck size={19} stroke={2.6} className="text-primary shrink-0" />
      )}
      {chevron && (
        <Chevron size={16} className="text-muted-foreground shrink-0" />
      )}
    </button>
  );
}
