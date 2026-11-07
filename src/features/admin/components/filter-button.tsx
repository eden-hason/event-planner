import type { ComponentProps } from 'react';
import { ChevronDown } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** A filter bar's button: the filter's name, then what it is set to. */
export function FilterButton({
  label,
  selection,
  ...props
}: { label: string; selection: string | null } & ComponentProps<typeof Button>) {
  return (
    <Button
      variant={selection ? 'soft' : 'outline'}
      size="sm"
      className={cn(
        'text-[12.5px] font-medium shadow-none',
        !selection && 'bg-card',
      )}
      {...props}
    >
      <span className={cn(selection && 'text-muted-foreground font-normal')}>{label}</span>
      {selection && <span>{selection}</span>}
      <ChevronDown className="text-muted-foreground" />
    </Button>
  );
}
