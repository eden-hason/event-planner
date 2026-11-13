'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type RadioCardOption<V extends string> = {
  value: V;
  label: string;
  description?: string;
  /** Shown but not offered. */
  disabled?: boolean;
  /** Under the card, outside its button: a way to make it available, say. */
  extra?: ReactNode;
};

/**
 * A choice between a few cards, as the open Schedule's settings offer one:
 * the bordered card per option, the selected one tinted.
 */
export function RadioCardGroup<V extends string>({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: V | null;
  options: RadioCardOption<V>[];
  onChange: (value: V) => void;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-2">
      {options.map((option) => {
        const checked = option.value === value;
        const selectable = !disabled && !option.disabled;
        return (
          <div
            key={option.value}
            className={cn(
              'flex flex-col gap-0.5 rounded-xl border-[1.5px] p-3 transition-colors',
              checked ? 'border-primary bg-primary/5' : 'border-border',
              selectable && !checked && 'hover:border-primary/50',
              option.disabled && 'opacity-70',
            )}
          >
            <button
              type="button"
              role="radio"
              aria-checked={checked}
              aria-disabled={!selectable}
              disabled={!selectable}
              onClick={() => onChange(option.value)}
              className={cn(
                'flex flex-col gap-0.5 text-start',
                selectable ? 'cursor-pointer' : 'cursor-default',
              )}
            >
              <span className="text-sm font-semibold">{option.label}</span>
              {option.description && (
                <span className="text-muted-foreground text-xs leading-relaxed">
                  {option.description}
                </span>
              )}
            </button>
            {option.extra}
          </div>
        );
      })}
    </div>
  );
}
