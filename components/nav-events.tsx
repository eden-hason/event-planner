'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { ChevronsUpDown, Copy, LogOutIcon, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
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
import { type EventApp } from '@/features/events/schemas';
import { deleteEvent, duplicateEvent } from '@/features/events/actions';
import { logout } from '@/features/auth';
import { IconUser } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { useTranslations, useLocale } from 'next-intl';

interface NavEventsProps {
  events: EventApp[];
  currentUserId?: string;
  user: {
    name: string;
    email?: string;
    phone?: string;
    avatar?: string;
  };
}

export function NavEvents({ events, currentUserId, user }: NavEventsProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<EventApp | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('sidebar');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const dir = locale === 'he' ? 'rtl' : 'ltr';

  // Extract eventId from pathname (e.g., /app/{eventId}/dashboard)
  const currentEventId = pathname.match(/^\/app\/([^/]+)/)?.[1] || null;

  // Find the current event
  const currentEvent = events.find((event) => event.id === currentEventId);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
  };

  const handleNewEventClick = () => {
    setDropdownOpen(false);
    router.push('/app/new-event');
  };

  const handleDuplicate = async (event: EventApp) => {
    setDropdownOpen(false);

    const promise = duplicateEvent(event.id).then((result) => {
      if (!result.success) {
        throw new Error(result.message || t('toast.duplicateFailed'));
      }
      return result;
    });

    toast.promise(promise, {
      loading: t('toast.duplicating', { title: event.title }),
      success: (data) => {
        if (data.eventId) {
          router.push(`/app/${data.eventId}/dashboard`);
        }
        return data.message || t('toast.duplicated');
      },
      error: (err) =>
        err instanceof Error ? err.message : t('toast.duplicateFailed'),
    });
  };

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
      success: (data) => {
        setDeleteDialogOpen(false);
        setEventToDelete(null);

        const remainingEvents = events.filter((e) => e.id !== eventId);
        if (remainingEvents.length === 0) {
          router.push('/app');
        } else if (currentEventId === eventId) {
          router.push(`/app/${remainingEvents[0].id}/dashboard`);
        }

        return data.message || t('toast.deleted');
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
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="size-8 rounded-lg">
                {user.avatar ? (
                  <Image
                    src={user.avatar}
                    alt={user.name}
                    width={32}
                    height={32}
                    className="aspect-square size-full object-cover"
                  />
                ) : (
                  <AvatarFallback className="rounded-lg">
                    <IconUser className="size-4" />
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="grid flex-1 text-start text-sm leading-tight">
                <span className="truncate font-semibold">{user.name}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {currentEvent ? currentEvent.title : t('noEventSelected')}
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
            {/* Section 1: User header */}
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
                <Avatar className="size-8 rounded-lg">
                  {user.avatar ? (
                    <Image
                      src={user.avatar}
                      alt={user.name}
                      width={32}
                      height={32}
                      className="aspect-square size-full object-cover"
                    />
                  ) : (
                    <AvatarFallback className="rounded-lg">
                      <IconUser className="size-4" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="grid flex-1 text-start text-sm leading-tight">
                  <span className="truncate font-semibold">{user.name}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {user.email || user.phone}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            {/* Section 2: Events */}
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              {t('events')}
            </DropdownMenuLabel>
            <div className="flex flex-col gap-1">
              {events.length === 0 ? (
                <DropdownMenuItem disabled>
                  <span className="text-muted-foreground">{t('noEventsYet')}</span>
                </DropdownMenuItem>
              ) : (
                events.map((event) => {
                  const isActive = currentEventId === event.id;
                  const isShared = currentUserId
                    ? event.userId !== currentUserId
                    : false;

                  return (
                    <DropdownMenuItem
                      key={event.id}
                      className={cn('gap-2 p-2 group', isActive && 'bg-accent')}
                    >
                      <div
                        className="flex-1 cursor-pointer grid text-start text-sm leading-tight"
                        onClick={() => router.push(`/app/${event.id}/dashboard`)}
                      >
                        <span className="truncate font-medium">
                          {event.title}
                        </span>
                        <span className="text-muted-foreground truncate text-xs">
                          {event.eventType}
                          {isShared && (
                            <span className="text-primary ms-1.5 font-medium">
                              · {t('shared')}
                            </span>
                          )}
                        </span>
                      </div>
                      <div
                        className={cn(
                          'flex opacity-0 group-hover:opacity-100 transition-opacity',
                          isShared && 'hidden',
                        )}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicate(event);
                          }}
                          aria-label={t('duplicateEvent')}
                        >
                          <Copy className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEventToDelete(event);
                            setDeleteDialogOpen(true);
                            setDropdownOpen(false);
                          }}
                          aria-label={t('deleteEvent')}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </DropdownMenuItem>
                  );
                })
              )}
            </div>
            <DropdownMenuItem asChild className="p-0">
              <button
                type="button"
                className="flex w-full items-center gap-2 p-2"
                onClick={handleNewEventClick}
              >
                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                  <Plus className="size-4" />
                </div>
                <div className="text-muted-foreground font-medium">
                  {t('newEvent')}
                </div>
              </button>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Section 3: Log out */}
            <DropdownMenuItem
              className="cursor-pointer text-red-600"
              onClick={handleLogout}
            >
              <LogOutIcon className="text-red-600 rtl:scale-x-[-1]" />
              {t('logOut')}
            </DropdownMenuItem>
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
