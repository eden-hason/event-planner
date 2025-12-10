'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import {
  IconTemplate,
  IconDashboard,
  IconHelp,
  IconSettings,
  IconUsers,
  IconGift,
  IconCalendar,
  IconCoins,
} from '@tabler/icons-react';
import { NavMain } from '@/components/nav-main';
import { NavSecondary } from '@/components/nav-secondary';
import { NavEvents } from '@/components/nav-events';
import { PartyPopper } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { type EventApp } from '@/features/events/schemas';

// Helper function to extract eventId from pathname
function getEventIdFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/app\/([^/]+)/);
  return match ? match[1] : null;
}

// Helper function to build navigation URLs with eventId
function buildNavUrl(basePath: string, eventId: string | null): string {
  if (!eventId) {
    return basePath;
  }
  // Replace /app/ with /app/{eventId}/
  return basePath.replace(/^\/app\//, `/app/${eventId}/`);
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  events: EventApp[];
}

export function AppSidebar({ events, ...props }: AppSidebarProps) {
  const pathname = usePathname();
  const eventId = getEventIdFromPathname(pathname);
  const navMainBase = [
    {
      title: 'Dashboard',
      url: '/app/dashboard',
      icon: IconDashboard,
    },
    {
      title: 'Guests',
      url: '/app/guests',
      icon: IconUsers,
    },
    {
      title: 'Templates',
      url: '/app/templates',
      icon: IconTemplate,
    },
    {
      title: 'Schedules',
      url: '/app/schedules',
      icon: IconCalendar,
    },
    {
      title: 'Expenses',
      url: '/app/expenses',
      icon: IconCoins,
    },
    {
      title: 'Gifts',
      url: '/app/gifts',
      icon: IconGift,
    },
  ];

  const navMain = navMainBase.map((item) => ({
    ...item,
    url: buildNavUrl(item.url, eventId),
  }));

  const navSecondary = [
    {
      title: 'Settings',
      url: '#',
      icon: IconSettings,
    },
    {
      title: 'Get Help',
      url: '#',
      icon: IconHelp,
    },
  ];

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <PartyPopper className="!size-5" />
                <span className="text-base font-semibold">Kululu Events</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavEvents events={events} />
      </SidebarFooter>
    </Sidebar>
  );
}
