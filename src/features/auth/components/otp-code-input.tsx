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
