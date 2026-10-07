'use client';

import type { Ref } from 'react';
import { cn } from '@/lib/utils';

/**
 * Six code boxes. The boxes are presentation; one real input sits invisibly
 * over them so paste, autofill and the OS one-time-code hint all keep working.
 */
export function OtpCodeInput({
  value,
  onChange,
  label,
  inputRef,
  name = 'token',
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  inputRef?: Ref<HTMLInputElement>;
  name?: string;
}) {
  return (
    <div className="relative my-5">
      <div dir="ltr" className="flex justify-center gap-2.5">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className={cn(
              'flex h-14 w-[46px] items-center justify-center rounded-[14px] bg-white font-rubik text-2xl font-bold text-[var(--kt-ink)] transition-colors',
              i === value.length
                ? 'border-2 border-[var(--kt-brand)]'
                : 'border-[1.5px] border-[var(--kt-border)]',
            )}
          >
            {value[i] ?? ''}
          </div>
        ))}
      </div>
      <input
        ref={inputRef}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        inputMode="numeric"
        maxLength={6}
        autoComplete="one-time-code"
        required
        aria-label={label}
        className="absolute inset-0 h-full w-full opacity-[0.01]"
      />
    </div>
  );
}

export function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  );
}
