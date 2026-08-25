'use client';

import { useState } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { CalendarDays, ChevronsUpDown, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  deleteEvent,
  readHostNames,
  type EventApp,
} from '@/features/events';
import { cn } from '@/lib/utils';
import { useTranslations, useLocale } from 'next-intl';

interface NavEventsProps {
  events: EventApp[];
  currentUserId?: string;
  disabled?: boolean;
}

export function NavEvents({ events, currentUserId, disabled }: NavEventsProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<EventApp | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('sidebar');
  const tCommon = useTranslations('common');
  const tEventTypes = useTranslations('eventDetails.dateTime.types');
  const locale = useLocale();
  const dir = locale === 'he' ? 'rtl' : 'ltr';
  const eventTypeLabels: Record<string, string> = {
    wedding: tEventTypes('wedding'),
    henna: tEventTypes('henna'),
    bar_mitzva: tEventTypes('bar_mitzva'),
    bat_mitzva: tEventTypes('bat_mitzva'),
  };

  const getEventTypeLabel = (eventType?: string) =>
    eventType ? (eventTypeLabels[eventType] ?? eventType) : t('noEventSelected');

  const getEventHostLabel = (event: EventApp) => {
    const { brideName, groomName, childName } = readHostNames(event.hostDetails);
    const hostNames =
      event.eventType === 'wedding' || event.eventType === 'henna'
        ? [brideName, groomName]
        : event.eventType === 'bar_mitzva' || event.eventType === 'bat_mitzva'
          ? [childName]
          : [brideName, groomName, childName];
    const availableHostNames = hostNames.filter(
      (name): name is string => Boolean(name),
    );

    return availableHostNames.length
      ? new Intl.ListFormat(locale, {
          style: 'short',
          type: 'conjunction',
        }).format(availableHostNames)
      : event.title;
  };

  // Extract eventId from pathname (e.g., /app/{eventId}/dashboard)
  const currentEventId = pathname.match(/^\/app\/([^/]+)/)?.[1] || null;

  // Find the current event
  const currentEvent = events.find((event) => event.id === currentEventId);

  const handleNewEventClick = () => {
    setDropdownOpen(false);
    // `?new` overrides the takeover's guard against opening for someone who
    // already has an event - here, a second event is exactly what was asked for.
    router.push('/start?new=1');
  };

  const handleEventSelect = (eventId: string) => {
    setDropdownOpen(false);
    router.push(`/app/${eventId}/dashboard`);
  };

  const currentEventIsShared = currentEvent
    ? currentUserId
      ? currentEvent.userId !== currentUserId
      : false
    : false;

  const handleConfirmDelete = async () => {
    if (!eventToDelete) return;

    const eventTitle = eventToDelete.title;
    const eventId = eventToDelete.id;

    const promise = deleteEvent(eventId).then((result) => {
      if (!result.success) {
        throw new Error(result.message || t('toast.deleteFailed'));
      }
      return result;
    });

    toast.promise(promise, {
      loading: t('toast.deleting', { title: eventTitle }),
      success: () => {
        setDeleteDialogOpen(false);
        setEventToDelete(null);

        const remainingEvents = events.filter((e) => e.id !== eventId);
        if (remainingEvents.length === 0) {
          router.push('/app');
        } else if (currentEventId === eventId) {
          router.push(`/app/${remainingEvents[0].id}/dashboard`);
        }

        return t('toast.deleted');
      },
      error: (err) =>
        err instanceof Error ? err.message : t('toast.deleteFailed'),
    });

    try {
      await promise;
    } catch {
      setDeleteDialogOpen(false);
      setEventToDelete(null);
    }
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen} dir={dir}>
          <DropdownMenuTrigger asChild disabled={disabled}>
            <SidebarMenuButton
              size="lg"
              className={cn(
                'data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground',
                disabled && 'cursor-default opacity-50 pointer-events-none',
              )}
            >
              <CalendarDays />
              <div className="grid flex-1 text-start text-sm leading-tight">
                <span className="truncate font-semibold">
                  {currentEvent ? getEventHostLabel(currentEvent) : t('events')}
                </span>
                <span className="text-muted-foreground truncate text-xs">
                  {getEventTypeLabel(currentEvent?.eventType)}
                </span>
              </div>
              <ChevronsUpDown className="ms-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side="top"
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              {t('events')}
            </DropdownMenuLabel>
            {events.length === 0 ? (
              <DropdownMenuGroup>
                <DropdownMenuItem disabled>
                  <span className="text-muted-foreground">{t('noEventsYet')}</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            ) : (
              <DropdownMenuRadioGroup
                value={currentEventId ?? ''}
                onValueChange={handleEventSelect}
              >
                {events.map((event) => {
                  const isShared = currentUserId
                    ? event.userId !== currentUserId
                    : false;

                  return (
                    <DropdownMenuRadioItem
                      key={event.id}
                      value={event.id}
                    >
                      <div className="grid flex-1 text-start text-sm leading-tight">
                        <span className="truncate font-medium">
                          {getEventHostLabel(event)}
                        </span>
                        <span className="text-muted-foreground truncate text-xs">
                          {getEventTypeLabel(event.eventType)}
                          {isShared && (
                            <span className="text-primary ms-1.5 font-medium">
                              · {t('shared')}
                            </span>
                          )}
                        </span>
                      </div>
                    </DropdownMenuRadioItem>
                  );
                })}
              </DropdownMenuRadioGroup>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onSelect={handleNewEventClick}>
                <Plus />
                {t('newEvent')}
              </DropdownMenuItem>
              {currentEvent && !currentEventIsShared && (
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => {
                    setEventToDelete(currentEvent);
                    setDeleteDialogOpen(true);
                    setDropdownOpen(false);
                  }}
                >
                  <Trash2 />
                  {t('deleteEvent')}
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('deleteEventTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('deleteEventDescription', { title: eventToDelete?.title ?? '' })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={handleConfirmDelete}
              >
                {t('deleteEvent')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
