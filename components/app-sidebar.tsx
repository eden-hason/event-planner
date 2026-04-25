'use client';

import * as React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import {
  IconTemplate,
  IconDashboard,
  IconHelp,
  IconSettings,
  IconUsers,
  IconCalendar,
  IconCoins,
  IconAlertSquareRounded,
} from '@tabler/icons-react';
import { NavMain } from '@/components/nav-main';
import { NavSecondary } from '@/components/nav-secondary';
import { NavEvents } from '@/components/nav-events';
import { LanguageSwitcher } from '@/components/language-switcher';
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
import { useCollaboration } from '@/components/feature-layout';
import { Badge } from '@/components/ui/badge';

const SEATING_MANAGER_ALLOWED = ['dashboard', 'guests', 'settings'];

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
  currentUserId?: string;
  user: {
    name: string;
    email?: string;
    avatar?: string;
  };
}

export function AppSidebar({
  events,
  currentUserId,
  user,
  ...props
}: AppSidebarProps) {
  const pathname = usePathname();
  const eventId = getEventIdFromPathname(pathname);
  const { isOwner } = useCollaboration();
  const tNav = useTranslations('navigation');
  const locale = useLocale();
  const isRTL = locale === 'he';

  const navMainBase = [
    {
      id: 'dashboard',
      title: tNav('dashboard'),
      url: '/app/dashboard',
      icon: IconDashboard,
    },
    {
      id: 'eventDetails',
      title: tNav('eventDetails'),
      url: '/app/details',
      icon: IconAlertSquareRounded,
    },
    {
      id: 'guests',
      title: tNav('guests'),
      url: '/app/guests',
      icon: IconUsers,
    },
    {
      id: 'schedules',
      title: tNav('schedules'),
      url: '/app/schedules',
      icon: IconCalendar,
    },
    {
      id: 'budget',
      title: tNav('budget'),
      url: '/app/budget',
      icon: IconCoins,
    },
    {
      id: 'templates',
      title: tNav('templates'),
      url: '/app/templates',
      icon: IconTemplate,
      comingSoon: true,
    },
  ];

  const filteredNavMain = isOwner
    ? navMainBase
    : navMainBase.filter((item) =>
        SEATING_MANAGER_ALLOWED.includes(item.id),
      );

  const navMain = filteredNavMain.map((item) => ({
    ...item,
    url: buildNavUrl(item.url, eventId),
  }));

  const navSecondary = [
    {
      title: tNav('settings'),
      url: buildNavUrl('/app/settings', eventId),
      icon: IconSettings,
    },
    {
      title: tNav('getHelp'),
      url: '#',
      icon: IconHelp,
    },
  ];

  return (
    <Sidebar side={isRTL ? 'right' : 'left'} collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#" dir="ltr" className={isRTL ? 'justify-end' : undefined}>
                <PartyPopper className="!size-5" />
                <span className="text-base font-semibold">Kululu</span>
                <Badge className="rounded-sm border-none bg-gray-500 text-gray-300">
                  Beta
                </Badge>
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
        <div className="px-2 pb-1">
          <LanguageSwitcher />
        </div>
        <NavEvents events={events} currentUserId={currentUserId} user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
