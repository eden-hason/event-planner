'use client';

import * as React from 'react';
import {
  IconTemplate,
  IconDashboard,
  IconHelp,
  IconInnerShadowTop,
  IconSettings,
  IconUsers,
  IconGift,
  IconCash,
  IconCalendar,
} from '@tabler/icons-react';
import { NavMain } from '@/components/nav-main';
import { NavSecondary } from '@/components/nav-secondary';
import { NavUser } from '@/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
const data = {
  navMain: [
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
      title: "Schedules",
      url: '/app/schedules',
      icon: IconCalendar,
    },
    {
      title: 'Expenses',
      url: '/app/expenses',
      icon: IconCash,
    },
    {
      title: 'Gifts',
      url: '/app/gifts',
      icon: IconGift,
    },
  ],
  navSecondary: [
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
  ],
};

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: {
    name: string;
    email?: string;
    avatar?: string;
  };
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
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
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">Kululu Events</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
