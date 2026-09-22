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
  /**
   * `lg` is the 44x26 track settings lists use. Not `size`: that name is taken
   * by the input attribute this component forwards.
   */
  switchSize?: 'default' | 'lg';
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, onCheckedChange, switchSize = 'default', ...props }, ref) => {
    const large = switchSize === 'lg';
    return (
      <label
        className={cn(
          'relative inline-flex shrink-0 cursor-pointer items-center rounded-full transition-colors',
          large ? 'h-[26px] w-11' : 'h-5 w-9',
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
            'bg-background pointer-events-none block rounded-full shadow-lg ring-0 transition-transform',
            large ? 'size-5' : 'size-4',
            large
              ? checked
                ? 'translate-x-[21px] rtl:-translate-x-[21px]'
                : 'translate-x-[3px] rtl:-translate-x-[3px]'
              : checked
                ? 'translate-x-4 rtl:-translate-x-4'
                : 'translate-x-0.5 rtl:-translate-x-0.5',
          )}
        />
      </label>
    );
  },
);
Switch.displayName = 'Switch';

export { Switch };
