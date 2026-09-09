'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Check, Plus, X } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { type EventApp } from '@/features/events';
import { cn } from '@/lib/utils';
import {
  eventAvatarTint,
  eventDisplayTitle,
  eventInitials,
  formatEventDateShort,
} from './event-summary';

type MobileEventSwitcherProps = {
  events: EventApp[];
  currentEventId: string;
  guestCounts: Record<string, number>;
  currentUserId?: string;
};

/**
 * The event picker behind the "More" page's header card.
 *
 * A bottom drawer rather than a dialog: the list is short, and the whole point
 * of the "More" page is that everything on it is reachable with one thumb.
 */
export function MobileEventSwitcher({
  events,
  currentEventId,
  guestCounts,
  currentUserId,
}: MobileEventSwitcherProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('more');
  const tSidebar = useTranslations('sidebar');

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" size="sm" className="shrink-0">
          {t('switchEvent')}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="mx-auto max-w-md">
        <div className="flex items-start justify-between gap-4 px-4 pt-3 pb-4">
          <div className="min-w-0 text-start">
            <DrawerTitle className="text-lg">{t('picker.title')}</DrawerTitle>
            <DrawerDescription className="mt-0.5 text-xs">
              {t('picker.description')}
            </DrawerDescription>
          </div>
          <DrawerClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="-mt-1 shrink-0"
              aria-label={t('picker.close')}
            >
              <X />
            </Button>
          </DrawerClose>
        </div>

        <div
          role="radiogroup"
          aria-label={t('picker.title')}
          className="mx-4 mb-6 overflow-hidden rounded-xl border"
        >
          {events.map((event) => {
            const isActive = event.id === currentEventId;
            const isShared = currentUserId
              ? event.userId !== currentUserId
              : false;
            const date = formatEventDateShort(event.eventDate, locale);
            const count = guestCounts[event.id];

            return (
              <button
                key={event.id}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => go(`/app/${event.id}/dashboard`)}
                className={cn(
                  'flex w-full items-center gap-3 border-b px-3.5 py-3 text-start last:border-b-0',
                  'transition-colors active:opacity-70',
                  isActive && 'bg-muted/50',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-[10px] text-sm font-bold',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : eventAvatarTint(event.id),
                  )}
                >
                  {eventInitials(event)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] leading-tight font-medium">
                    {eventDisplayTitle(event, locale)}
                  </span>
                  <span className="text-muted-foreground mt-0.5 block truncate text-xs">
                    {[
                      date ?? t('noDate'),
                      count === undefined ? null : t('guestCount', { count }),
                      isShared ? tSidebar('shared') : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                {isActive ? (
                  <span
                    aria-hidden
                    className="bg-foreground text-background flex size-5.5 shrink-0 items-center justify-center rounded-full"
                  >
                    <Check className="size-3.5" />
                  </span>
                ) : (
                  <span
                    aria-hidden
                    className="border-input size-5.5 shrink-0 rounded-full border-[1.5px]"
                  />
                )}
              </button>
            );
          })}

          {/*
            `?new` overrides the takeover's guard against opening for someone
            who already has an event - here, a second event is exactly what was
            asked for.
          */}
          <button
            type="button"
            onClick={() => go('/start?new=1')}
            className="flex w-full items-center gap-3 border-t px-3.5 py-3 text-start transition-colors active:opacity-70"
          >
            <span
              aria-hidden
              className="border-muted-foreground/50 text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-[10px] border-[1.5px] border-dashed"
            >
              <Plus className="size-[18px]" />
            </span>
            <span className="text-[15px] font-medium">
              {tSidebar('newEvent')}
            </span>
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
