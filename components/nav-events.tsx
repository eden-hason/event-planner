'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Plus, ChevronsUpDown } from 'lucide-react';
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
import { IconCarambola } from '@tabler/icons-react';

interface NavEventsProps {
  events: EventApp[];
}

export function NavEvents({ events }: NavEventsProps) {
  const pathname = usePathname();
  const { isMobile } = useSidebar();

  // Extract eventId from pathname (e.g., /app/{eventId}/dashboard)
  const currentEventId = pathname.match(/^\/app\/([^/]+)/)?.[1] || null;
  
  // Find the current event
  const currentEvent = events.find((event) => event.id === currentEventId);

  const handleNewEvent = () => {
    // Placeholder - does nothing for now
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
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
                  {currentEvent?.eventType || 'Select an event'}
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
                  asChild
                  className={`gap-2 p-1 ${isActive ? 'bg-accent' : ''}`}
                  >
                    <Link href={eventUrl}>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-medium">
                          {event.title}
                        </span>
                        <span className="text-muted-foreground truncate text-xs">
                          {event.eventType || 'No type'}
                        </span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                );
              })
            )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleNewEvent}
              className="gap-2 p-2"
            >
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="text-muted-foreground font-medium">New Event</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

