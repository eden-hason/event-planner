'use client';

import { useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { IconRefresh } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function InteractionsRefreshButton() {
  const router = useRouter();
  const t = useTranslations('schedules.interactions');
  const [isPending, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-muted-foreground hover:text-foreground"
      onClick={handleRefresh}
      disabled={isPending}
      aria-label={t('refresh')}
    >
      <IconRefresh
        size={15}
        className={cn(isPending && 'animate-spin')}
      />
    </Button>
  );
}
