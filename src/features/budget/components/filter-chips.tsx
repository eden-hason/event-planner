'use client';

import { cn } from '@/lib/utils';

export interface FilterChipItem<K extends string> {
  key: K;
  label: string;
  count: number;
}

const WRAPPER = {
  segmented: 'bg-muted flex shrink-0 gap-0.5 rounded-[10px] p-[3px]',
  pill: '-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
};

const CHIP = {
  segmented: {
    base: 'h-[30px] gap-1.5 rounded-lg px-[11px]',
    on: 'bg-card text-foreground font-bold shadow-[0_1px_3px_rgba(26,11,46,0.12)]',
    off: 'text-muted-foreground hover:text-foreground font-medium',
  },
  pill: {
    base: 'h-8 gap-1 rounded-full border px-[9px]',
    on: 'border-primary bg-primary/10 text-primary font-bold',
    off: 'bg-card text-muted-foreground font-medium',
  },
};

const COUNT = {
  segmented: { base: 'text-xs font-semibold', on: 'text-primary', off: 'text-muted-foreground' },
  pill: { base: 'font-bold', on: '', off: '' },
};

/**
 * The Budget lists' filter chips, in the guests page's two looks: a segmented
 * control on the desktop toolbar, a scrolling row of pills on the phone. The
 * phone row only has room for chips with something in them, so it drops an
 * empty one unless it is selected - the first chip ("all") always stays.
 */
export function FilterChips<K extends string>({
  items,
  value,
  onChange,
  variant,
  className,
}: {
  items: FilterChipItem<K>[];
  value: K;
  onChange: (key: K) => void;
  variant: 'segmented' | 'pill';
  className?: string;
}) {
  return (
    <div className={cn(WRAPPER[variant], className)}>
      {items.map((item, index) => {
        const active = value === item.key;
        if (variant === 'pill' && index > 0 && item.count === 0 && !active) return null;
        return (
          <button
            key={item.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(item.key)}
            className={cn(
              'flex shrink-0 items-center text-[13px] whitespace-nowrap transition-colors',
              CHIP[variant].base,
              active ? CHIP[variant].on : CHIP[variant].off,
            )}
          >
            {item.label}
            <span
              className={cn(
                'tabular-nums',
                COUNT[variant].base,
                active ? COUNT[variant].on : COUNT[variant].off,
              )}
            >
              {item.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
