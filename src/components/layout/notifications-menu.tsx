'use client';

import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

/**
 * UI shell only - there is no notifications data source yet. Wire this up to
 * a real feed (e.g. pending collaboration invites, or a dedicated
 * notifications table) before shipping it as more than a placeholder.
 */
export function NotificationsMenu() {
  const t = useTranslations('sidebar.notifications');

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t('title')}>
          <Bell />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-72 p-0">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold">{t('title')}</p>
        </div>
        <div className="text-muted-foreground px-4 py-8 text-center text-sm">
          {t('empty')}
        </div>
      </PopoverContent>
    </Popover>
  );
}
