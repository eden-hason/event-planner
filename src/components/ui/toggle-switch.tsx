'use client';

/*
 * Not shadcn's switch. This is a hand-rolled <label> + sr-only checkbox with an
 * RTL-aware thumb, and it does not depend on @radix-ui/react-switch.
 *
 * It lives under `toggle-switch` precisely so it does not occupy a registry
 * name: as `switch.tsx` an innocent `npx shadcn add switch` would overwrite it,
 * silently dropping the `rtl:` thumb translation below and the
 * InputHTMLAttributes contract every caller relies on.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    return (
      <label
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors',
          'focus-within:ring-ring focus-within:ring-2 focus-within:ring-offset-2',
          checked ? 'bg-primary' : 'bg-input',
          props.disabled && 'cursor-not-allowed opacity-50',
          className,
        )}
      >
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          className="sr-only"
          {...props}
        />
        <span
          className={cn(
            'bg-background pointer-events-none block h-4 w-4 rounded-full shadow-lg ring-0 transition-transform',
            checked ? 'translate-x-4 rtl:-translate-x-4' : 'translate-x-0.5 rtl:-translate-x-0.5',
          )}
        />
      </label>
    );
  },
);
Switch.displayName = 'Switch';

export { Switch };
