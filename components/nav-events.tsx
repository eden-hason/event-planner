'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronsUpDown, Copy, Plus, Trash2 } from 'lucide-react';
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
  useSidebar,
} from '@/components/ui/sidebar';
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
import { NewEventDialog } from '@/features/events/components/new-event-dialog';
import { deleteEvent, duplicateEvent } from '@/features/events/actions';
import { IconCarambola } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

interface NavEventsProps {
  events: EventApp[];
}

export function NavEvents({ events }: NavEventsProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<EventApp | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { isMobile } = useSidebar();

  // Extract eventId from pathname (e.g., /app/{eventId}/dashboard)
  const currentEventId = pathname.match(/^\/app\/([^/]+)/)?.[1] || null;

  // Find the current event
  const currentEvent = events.find((event) => event.id === currentEventId);

  const handleNewEventClick = () => {
    setDropdownOpen(false);
    setDialogOpen(true);
  };

  const handleDuplicate = async (event: EventApp) => {
    setDropdownOpen(false);

    const promise = duplicateEvent(event.id).then((result) => {
      if (!result.success) {
        throw new Error(result.message || 'Failed to duplicate event.');
      }
      return result;
    });

    toast.promise(promise, {
      loading: `Duplicating ${event.title}...`,
      success: (data) => {
        if (data.eventId) {
          router.push(`/app/${data.eventId}/dashboard`);
        }
        return data.message || 'Event duplicated successfully';
      },
      error: (err) =>
        err instanceof Error
          ? err.message
          : 'Failed to duplicate event. Please try again.',
    });
  };

  const handleConfirmDelete = async () => {
    if (!eventToDelete) return;

    const eventTitle = eventToDelete.title;
    const eventId = eventToDelete.id;

    const promise = deleteEvent(eventId).then((result) => {
      if (!result.success) {
        throw new Error(result.message || 'Failed to delete event.');
      }
      return result;
    });

    toast.promise(promise, {
      loading: `Deleting ${eventTitle}...`,
      success: (data) => {
        setDeleteDialogOpen(false);
        setEventToDelete(null);

        // Navigation logic
        const remainingEvents = events.filter(e => e.id !== eventId);
        if (remainingEvents.length === 0) {
          // No events left - navigate to empty state
          router.push('/app');
        } else if (currentEventId === eventId) {
          // Deleted current event - navigate to first remaining
          router.push(`/app/${remainingEvents[0].id}/dashboard`);
        }
        // else: viewing different event, stay put

        return data.message || 'Event deleted successfully';
      },
      error: (err) =>
        err instanceof Error
          ? err.message
          : 'Failed to delete event. Please try again.',
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
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <IconCarambola className="size-5" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {currentEvent ? currentEvent.title : 'No event selected'}
                </span>
                <span className="truncate text-xs">
                  {currentEvent?.eventType}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Events
            </DropdownMenuLabel>
            <div className="flex flex-col gap-1">
              {events.length === 0 ? (
                <DropdownMenuItem disabled>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="text-muted-foreground">No events yet</span>
                  </div>
                </DropdownMenuItem>
              ) : (
                events.map((event) => {
                  const eventUrl = `/app/${event.id}/dashboard`;
                  const isActive = currentEventId === event.id;

                  return (
                    <DropdownMenuItem
                      key={event.id}
                      className={cn('gap-2 p-2 group', isActive && 'bg-accent')}
                    >
                      {/* Clickable area for navigation */}
                      <div
                        className="flex-1 cursor-pointer grid text-left text-sm leading-tight"
                        onClick={() => router.push(eventUrl)}
                      >
                        <span className="truncate font-medium">
                          {event.title}
                        </span>
                        <span className="text-muted-foreground truncate text-xs">
                          {event.eventType}
                        </span>
                      </div>

                      {/* Action buttons - visible on hover */}
                      <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicate(event);
                          }}
                          aria-label="Duplicate event"
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
                          aria-label="Delete event"
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </DropdownMenuItem>
                  );
                })
              )}
            </div>
            <DropdownMenuSeparator />
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
                  New Event
                </div>
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <NewEventDialog open={dialogOpen} onOpenChange={setDialogOpen} />
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Event?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{eventToDelete?.title}&quot;? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={handleConfirmDelete}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
