'use client';

import { useTransition } from 'react';
import { IconRefresh } from '@tabler/icons-react';

import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Re-runs the server render for the current route. Generic on purpose: any
 * card showing server-fetched data that changes while the user watches it
 * (schedule interactions, call round outcomes) can drop this in with its own
 * accessible label.
 */
export function RefreshButton({
  label,
  withLabel = false,
}: {
  label: string;
  /** Show the label beside the icon, as a bordered button, rather than the bare icon. */
  withLabel?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant={withLabel ? 'outline' : 'ghost'}
      size={withLabel ? 'sm' : 'icon'}
      className={cn(
        'text-muted-foreground hover:text-foreground',
        withLabel ? 'h-[34px] gap-1.5 rounded-[10px] px-3 text-[12.5px] font-semibold' : 'h-7 w-7',
      )}
      onClick={() => startTransition(() => router.refresh())}
      disabled={isPending}
      aria-label={withLabel ? undefined : label}
    >
      <IconRefresh size={15} className={cn(isPending && 'animate-spin')} />
      {withLabel && label}
    </Button>
  );
}
