'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';

interface ToggleCardProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  control?: 'switch' | 'checkbox';
  value?: boolean;
  defaultValue?: boolean;
  onChange?: (value: boolean) => void;
  children?: React.ReactNode;
  className?: string;
}

export function ToggleCard({
  icon,
  title,
  subtitle,
  control = 'switch',
  value,
  defaultValue = false,
  onChange,
  children,
  className,
}: ToggleCardProps) {
  const [internal, setInternal] = React.useState(defaultValue);
  const on = value !== undefined ? value : internal;

  const toggle = () => {
    const next = !on;
    if (value === undefined) setInternal(next);
    onChange?.(next);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      toggle();
    }
  };

  return (
    <div
      className={cn(
        'overflow-hidden rounded-[var(--radius-xl)] border bg-card transition-all duration-200',
        on ? 'border-primary/35 ring-4 ring-primary/10' : 'border-border',
        className,
      )}
    >
      <div
        role="switch"
        aria-checked={on}
        tabIndex={0}
        onClick={toggle}
        onKeyDown={onKeyDown}
        className="flex cursor-pointer select-none items-center gap-3.5 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {icon && (
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-lg)] transition-all duration-200',
              on
                ? 'bg-primary/10 text-primary'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {icon}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold leading-snug">
            <span>{title}</span>
          </div>
          {subtitle && (
            <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {control === 'checkbox' ? (
          <Checkbox
            checked={on}
            aria-hidden
            tabIndex={-1}
            className="pointer-events-none"
          />
        ) : (
          <Switch
            checked={on}
            aria-hidden
            tabIndex={-1}
            className="pointer-events-none"
          />
        )}
      </div>

      {children && (
        <div
          className={cn(
            'grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
            on ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <div
              className={cn(
                'border-t border-dashed border-border px-4 pb-4 pt-4 transition-[opacity,transform] duration-300',
                on
                  ? 'translate-y-0 opacity-100 delay-100'
                  : '-translate-y-1 opacity-0 delay-0',
              )}
            >
              {children}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
