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
export function RefreshButton({ label }: { label: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-muted-foreground hover:text-foreground h-7 w-7"
      onClick={() => startTransition(() => router.refresh())}
      disabled={isPending}
      aria-label={label}
    >
      <IconRefresh size={15} className={cn(isPending && 'animate-spin')} />
    </Button>
  );
}
