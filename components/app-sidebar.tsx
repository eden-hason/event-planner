'use client';

import * as React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import {
  IconDashboard,

  IconUsers,
  IconUsersGroup,
  IconCalendar,
  IconCoins,
  IconListDetails,
  IconArmchair,
} from '@tabler/icons-react';
import { useIsMobile } from '@/hooks/use-mobile';
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
  useSidebar,
} from '@/components/ui/sidebar';
import { type EventApp } from '@/features/events/schemas';
import { useCollaboration } from '@/components/feature-layout';
import { Badge } from '@/components/ui/badge';

const SEATING_MANAGER_ALLOWED = ['dashboard', 'guests', 'seating', 'settings'];

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
  const isMobile = useIsMobile();
  const isSeatingPage = pathname.includes('/seating');
  const { setOpen, state } = useSidebar();

  // Track what the open state was before entering seating so we can restore it on exit
  const prevOpenRef = React.useRef<boolean | null>(null);
  const stateRef = React.useRef(state);
  React.useEffect(() => { stateRef.current = state; });

  React.useEffect(() => {
    if (isSeatingPage) {
      if (prevOpenRef.current === null) {
        prevOpenRef.current = stateRef.current === 'expanded';
      }
      setOpen(false);
    } else if (prevOpenRef.current !== null) {
      setOpen(prevOpenRef.current);
      prevOpenRef.current = null;
    }
  }, [isSeatingPage, setOpen]);

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
      icon: IconListDetails,
    },
    {
      id: 'guests',
      title: tNav('guests'),
      url: '/app/guests',
      icon: IconUsers,
    },
    ...(!isMobile && process.env.NEXT_PUBLIC_ENABLE_SEATING === 'true'
      ? [
          {
            id: 'seating',
            title: tNav('seating'),
            url: '/app/seating',
            icon: IconArmchair,
          },
        ]
      : []),
    {
      id: 'schedules',
      title: tNav('schedules'),
      url: '/app/schedules',
      icon: IconCalendar,
    },
    {
      id: 'collaboration',
      title: tNav('collaboration'),
      url: '/app/collaborate',
      icon: IconUsersGroup,
    },
    ...(process.env.NEXT_PUBLIC_ENABLE_BUDGET === 'true'
      ? [
          {
            id: 'budget',
            title: tNav('budget'),
            url: '/app/budget',
            icon: IconCoins,
          },
        ]
      : []),
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

  const navSecondary: { title: string; url: string; icon: import('@tabler/icons-react').Icon }[] = [];

  return (
    <Sidebar
      side={isRTL ? 'right' : 'left'}
      collapsible={isSeatingPage ? 'icon' : 'offcanvas'}
      {...props}
      variant={isSeatingPage ? 'sidebar' : props.variant}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            {state === 'collapsed' ? (
              <SidebarMenuButton asChild>
                <a href="#" className="justify-center">
                  <PartyPopper className="!size-5" />
                </a>
              </SidebarMenuButton>
            ) : (
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
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} disabled={!eventId} />
        <NavSecondary items={navSecondary} disabled={!eventId} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        {process.env.NODE_ENV !== 'production' && state === 'expanded' && (
          <div className="px-2 pb-1">
            <LanguageSwitcher />
          </div>
        )}

        <NavEvents events={events} currentUserId={currentUserId} disabled={!eventId} user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
