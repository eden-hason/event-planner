'use client';

import Image from 'next/image';
import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TAKEOVER_TOKENS, TAKEOVER_WASH } from './constants';

/**
 * The full-bleed canvas every onboarding screen sits on.
 *
 * No app chrome: no sidebar, no top bar, no bottom nav. Today's wizard renders
 * inside the app shell, with a sidebar containing no events and a nav to pages
 * the user cannot visit yet - removing that is most of the fix.
 *
 * The marketing palette is set here as scoped custom properties so it cannot
 * leak into the app's design system, which the dashboard still owns.
 */
export function TakeoverShell({ children }: { children: ReactNode }) {
  return (
    <div
      data-takeover=""
      dir="rtl"
      className="relative flex min-h-svh flex-col overflow-x-hidden bg-[var(--kt-surface)] font-heebo text-[var(--kt-ink)]"
      style={TAKEOVER_TOKENS as CSSProperties}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{ background: TAKEOVER_WASH }}
      />
      <div className="relative flex min-h-svh flex-col">{children}</div>
    </div>
  );
}

/**
 * The brand lockup in the header corner - the same mark and wording the app's
 * top bar uses, so the takeover and the workspace it hands off to are stamped
 * identically. The gradient wordmark below stays for the sign-in hero, where
 * the brand is the headline rather than a corner mark.
 *
 * The mark is decorative here: the word beside it already names the brand, so
 * alt text would have a screen reader say "Kululu" twice.
 */
export function TakeoverLogo({ className }: { className?: string }) {
  return (
    // The lockup reads left-to-right in either direction, as a logotype does.
    <div dir="ltr" className={cn('flex items-center gap-2', className)}>
      <Image
        src="/kululu-logo-gray.svg"
        alt=""
        width={41}
        height={32}
        priority
        className="h-7 w-auto md:h-8"
      />
      <span className="text-xl font-semibold text-[var(--kt-ink)] md:text-[22px]">
        Kululu
      </span>
    </div>
  );
}

/** The wordmark, in the marketing gradient. */
export function TakeoverWordmark({ className }: { className?: string }) {
  return (
    <div
      dir="ltr"
      className={cn(
        'bg-gradient-to-l from-[var(--kt-violet-soft)] to-[var(--kt-brand)] bg-clip-text font-rubik font-extrabold tracking-[-0.02em] text-transparent',
        className,
      )}
    >
      Kululu
    </div>
  );
}

/**
 * Back control. The chevron points the way "back" reads in the active
 * direction, which in RTL is the opposite of the glyph's own orientation.
 */
export function TakeoverBackButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-10 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[var(--kt-border)] bg-[var(--kt-field)] text-[var(--kt-ink-muted)] transition-colors hover:border-[var(--kt-border-hover)]"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="rtl:rotate-180"
        aria-hidden="true"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>
  );
}

/** The takeover's primary action. */
export function TakeoverButton({
  children,
  onClick,
  type = 'button',
  disabled = false,
  pending = false,
  pulse = false,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  /**
   * Working on it: still reads as the action the person just took, in the
   * deeper brand shade, rather than greying out as if it were never available.
   */
  pending?: boolean;
  /** Draws the eye to the one action on the payoff screen. */
  pulse?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={cn(
        'h-[54px] rounded-2xl text-base font-bold text-white shadow-[var(--kt-brand-shadow)] transition-colors',
        pending
          ? 'cursor-wait bg-[var(--kt-brand-deep)]'
          : disabled
            ? 'cursor-default bg-[var(--kt-disabled)] text-[color:var(--kt-on-disabled)] shadow-none'
            : 'cursor-pointer bg-[var(--kt-brand)] hover:bg-[var(--kt-brand-deep)]',
        pulse && !disabled && !pending && 'animate-[kt-pulse-ring_2s_ease-out_1.4s_infinite]',
        className,
      )}
    >
      {children}
    </button>
  );
}

/** The quiet escape hatch under a question - "we don't have a date yet". */
export function TakeoverSkipButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-12 cursor-pointer rounded-2xl bg-transparent text-[14.5px] font-semibold text-[var(--kt-ink-faint)] transition-colors hover:text-[var(--kt-brand)]"
    >
      {children}
    </button>
  );
}

/**
 * The shape every field in the takeover shares.
 *
 * Exported because one of the fields is not ours: the venue screen dresses a
 * shadcn `InputGroup` in it, and that component ships with the app design
 * system's 36px height and small radius. A field that sizes itself
 * independently reads as a mistake next to the others, so both take their
 * measurements from here.
 */
export const TAKEOVER_FIELD =
  'h-[54px] w-full rounded-2xl border-[1.5px] border-[var(--kt-border)] bg-[var(--kt-field)] text-[17px] font-medium text-[var(--kt-ink)]';

/** Text field, shared by every screen that takes typed input. */
export function TakeoverInput({
  invalid = false,
  className,
  ...props
}: React.ComponentProps<'input'> & { invalid?: boolean }) {
  return (
    <input
      {...props}
      className={cn(
        TAKEOVER_FIELD,
        'px-[18px] outline-none',
        'focus:border-[var(--kt-brand)] focus:shadow-[0_0_0_3px_rgba(210,60,194,0.18)]',
        invalid && 'border-[var(--kt-danger)]',
        className,
      )}
    />
  );
}

/** Question heading and its supporting line. */
export function TakeoverHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: ReactNode;
}) {
  return (
    <>
      <h1 className="text-[26px] leading-tight font-bold text-balance md:text-3xl">
        {title}
      </h1>
      {subtitle && (
        <div className="mb-[18px] text-sm text-[var(--kt-ink-muted)] md:mb-5 md:text-[15px]">
          {subtitle}
        </div>
      )}
    </>
  );
}

/** A hairline either side of a word ("or") between two ways forward. */
export function TakeoverDivider({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn('flex items-center gap-3 text-xs text-[var(--kt-ink-faint)]', className)}
    >
      <div className="h-px flex-1 bg-[var(--kt-border-soft)]" />
      {children}
      <div className="h-px flex-1 bg-[var(--kt-border-soft)]" />
    </div>
  );
}

/** Inline validation message. */
export function TakeoverError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-[13px] font-medium text-[var(--kt-danger)]">
      {children}
    </p>
  );
}
