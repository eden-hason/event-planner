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
}

export function AppSidebar({
  events,
  currentUserId,
  ...props
}: AppSidebarProps) {
  const pathname = usePathname();
  const eventId = getEventIdFromPathname(pathname);
  const { isOwner } = useCollaboration();
  const tNav = useTranslations('navigation');
  const locale = useLocale();
  const isRTL = locale === 'he';
  const isSeatingPage = pathname.includes('/seating');
  const { setOpen, state, toggleSidebar } = useSidebar();
  const isCollapsed = state === 'collapsed';

  // Track what the open state was before entering seating so we can restore it on exit
  const prevOpenRef = React.useRef<boolean | null>(null);
  const stateRef = React.useRef(state);
  React.useEffect(() => { stateRef.current = state; });

  /*
   * Held in a ref, and deliberately not in the effect's dependencies.
   * `useSidebar`'s `setOpen` is rebuilt whenever the sidebar's open state
   * changes, so depending on it re-runs this effect on the very change it
   * makes: reopening the sidebar on the Seating Plan would immediately
   * collapse it again, and the toggle would look broken. Collapsing is a
   * one-shot on arrival, not a rule enforced for as long as you stay.
   */
  const setOpenRef = React.useRef(setOpen);
  setOpenRef.current = setOpen;

  React.useEffect(() => {
    if (isSeatingPage) {
      if (prevOpenRef.current === null) {
        prevOpenRef.current = stateRef.current === 'expanded';
      }
      setOpenRef.current(false);
    } else if (prevOpenRef.current !== null) {
      setOpenRef.current(prevOpenRef.current);
      prevOpenRef.current = null;
    }
  }, [isSeatingPage]);

  React.useEffect(() => {
    const root = document.documentElement;
    const header = document.querySelector<HTMLElement>('[data-app-header]');

    if (!header) return;

    let frameId: number | null = null;

    const updateHeaderOffset = () => {
      frameId = null;
      const visibleHeaderHeight = Math.max(
        0,
        Math.min(header.offsetHeight, header.getBoundingClientRect().bottom),
      );

      root.style.setProperty(
        '--app-header-offset',
        `${visibleHeaderHeight}px`,
      );
    };

    const scheduleHeaderOffsetUpdate = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(updateHeaderOffset);
    };

    updateHeaderOffset();
    window.addEventListener('scroll', scheduleHeaderOffsetUpdate, {
      passive: true,
    });
    window.addEventListener('resize', scheduleHeaderOffsetUpdate);

    return () => {
      window.removeEventListener('scroll', scheduleHeaderOffsetUpdate);
      window.removeEventListener('resize', scheduleHeaderOffsetUpdate);
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      root.style.removeProperty('--app-header-offset');
    };
  }, []);

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
    // The Seating Plan works on mobile now (ADR-0009), so it is no longer
    // hidden below the breakpoint - only the feature flags gate it.
    ...(process.env.NEXT_PUBLIC_ENABLE_SEATING === 'true' ||
    process.env.NEXT_PUBLIC_DISABLED_SEATING_OPTION === 'true'
      ? [
          {
            id: 'seating',
            title: tNav('seating'),
            url: '/app/seating',
            icon: IconArmchair,
            comingSoon: process.env.NEXT_PUBLIC_DISABLED_SEATING_OPTION === 'true',
            isNew: true,
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
        <NavMain items={navMain} disabled={!eventId} />
        <NavSecondary items={navSecondary} disabled={!eventId} className="mt-auto" />
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

        <NavEvents events={events} currentUserId={currentUserId} disabled={!eventId} />
      </SidebarFooter>
    </Sidebar>
  );
}
