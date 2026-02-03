'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronsUpDown, Plus } from 'lucide-react';
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
import { type EventApp } from '@/features/events/schemas';
import { NewEventDialog } from '@/features/events/components/new-event-dialog';
import { IconCarambola } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

interface NavEventsProps {
  events: EventApp[];
}

export function NavEvents({ events }: NavEventsProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const pathname = usePathname();
  const { isMobile } = useSidebar();

  // Extract eventId from pathname (e.g., /app/{eventId}/dashboard)
  const currentEventId = pathname.match(/^\/app\/([^/]+)/)?.[1] || null;

  // Find the current event
  const currentEvent = events.find((event) => event.id === currentEventId);

  const handleNewEventClick = () => {
    setDropdownOpen(false);
    setDialogOpen(true);
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
                      asChild
                      key={event.id}
                      className={cn('gap-2 p-2', isActive && 'bg-accent')}
                    >
                      <Link href={eventUrl}>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                          <span className="truncate font-medium">
                            {event.title}
                          </span>
                          <span className="text-muted-foreground truncate text-xs">
                            {event.eventType}
                          </span>
                        </div>
                      </Link>
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
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
