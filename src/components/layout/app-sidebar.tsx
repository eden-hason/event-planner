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
  IconPalette,
} from '@tabler/icons-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { NavMain } from '@/components/layout/nav-main';
import { NavSecondary } from '@/components/layout/nav-secondary';
import { NavEvents } from '@/components/layout/nav-events';
import { LanguageSwitcher } from '@/components/language-switcher';
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { type EventApp } from '@/features/events/schemas';
import { useCollaboration } from '@/components/feature-layout';
import { Badge } from '@/components/ui/badge';

const SEATING_MANAGER_ALLOWED = ['dashboard', 'guests', 'seating', 'settings'];

const NON_EVENT_PATHS = new Set(['new-event']);

// Helper function to extract eventId from pathname
function getEventIdFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/app\/([^/]+)/);
  const id = match ? match[1] : null;
  return id && !NON_EVENT_PATHS.has(id) ? id : null;
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
  const isOnboarding = pathname === '/app/new-event';
  const { isOwner } = useCollaboration();
  const tNav = useTranslations('navigation');
  const locale = useLocale();
  const isRTL = locale === 'he';
  const isMobile = useIsMobile();
  const isSeatingPage = pathname.includes('/seating');
  const { setOpen, state, toggleSidebar } = useSidebar();
  const isCollapsed = state === 'collapsed';

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
    ...(process.env.NEXT_PUBLIC_ENABLE_TEMPLATES === 'true'
      ? [
          {
            id: 'templates',
            title: tNav('templates'),
            url: '/app/templates',
            icon: IconPalette,
          },
        ]
      : []),
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
      collapsible="icon"
      {...props}
      variant={isSeatingPage ? 'sidebar' : props.variant}
    >
      <SidebarContent>
        <NavMain items={navMain} disabled={!eventId || isOnboarding} />
        <NavSecondary items={navSecondary} disabled={!eventId || isOnboarding} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <div
          className={`flex items-center gap-1 px-2 pb-1 ${
            isCollapsed ? 'justify-center' : ''
          } ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          {process.env.NODE_ENV !== 'production' && state === 'expanded' && (
            <div className="flex-1">
              <LanguageSwitcher />
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            {isCollapsed ? (
              isRTL ? (
                <PanelRightOpen className="size-4" />
              ) : (
                <PanelLeftOpen className="size-4" />
              )
            ) : isRTL ? (
              <PanelRightClose className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
            <span className="sr-only">Toggle sidebar</span>
          </button>
        </div>

        <NavEvents events={events} currentUserId={currentUserId} disabled={!eventId && !isOnboarding} user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
