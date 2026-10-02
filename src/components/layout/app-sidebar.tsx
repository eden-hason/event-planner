'use client';

import * as React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import {
  IconHome,
  IconUsers,
  IconUsersGroup,
  IconSend,
  IconCoins,
  IconGift,
  IconListDetails,
  IconArmchair,
  IconPalette,
} from '@tabler/icons-react';
import { NavMain } from '@/components/layout/nav-main';
import { NavSecondary } from '@/components/layout/nav-secondary';
import { NavEvents } from '@/components/layout/nav-events';
import { LanguageSwitcher } from '@/components/language-switcher';
import { NotificationsMenu } from '@/components/layout/notifications-menu';
import { ThemeMenuButton } from '@/components/layout/theme-toggle';
import { Separator } from '@/components/ui/separator';
import { type AppShellUser, UserMenu } from '@/components/layout/user-menu';
import { SidebarToggleButton } from '@/components/layout/sidebar-toggle-button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import { type EventApp } from '@/features/events/schemas';
import { useCollaboration } from '@/components/feature-layout';
import { cn } from '@/lib/utils';

const SEATING_MANAGER_ALLOWED = ['home', 'guests', 'seating', 'settings'];

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
  user: AppShellUser;
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
  const tSidebar = useTranslations('sidebar');
  const locale = useLocale();
  const isRTL = locale === 'he';
  const isSeatingPage = pathname.includes('/seating');
  const { setOpen, state } = useSidebar();

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

  const navMainBase = [
    {
      id: 'home',
      title: tNav('home'),
      url: '/app/home',
      icon: IconHome,
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
      title: tNav('schedulesDesktop'),
      url: '/app/schedules',
      icon: IconSend,
    },
    {
      id: 'gifting',
      title: tNav('gifting'),
      url: '/app/gifting',
      icon: IconGift,
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
    // hidden below the breakpoint - only the feature flag gates it.
    ...(process.env.NEXT_PUBLIC_ENABLE_SEATING === 'true'
      ? [
          {
            id: 'seating',
            title: tNav('seating'),
            url: '/app/seating',
            icon: IconArmchair,
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
      // `app-sidebar` scopes the design's sidebar tokens (see globals.css) to
      // this sidebar alone - the admin back office shares the primitive. The
      // primitive draws the hairline on the container's content-facing edge;
      // `border-sidebar-border` gives it the sidebar's own tint instead of the
      // app-wide neutral `--border`. The `py-3` breathing room sits on this
      // container, outside the primitive's inner panel, so the container
      // needs the panel's fill too or the shell shows through the padding.
      className={cn(
        'app-sidebar bg-sidebar border-sidebar-border md:py-3',
        props.className,
      )}
    >
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <NavEvents
              events={events}
              currentUserId={currentUserId}
              disabled={!eventId}
            />
          </div>
          <SidebarToggleButton className="md:hidden" />
        </div>
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

        {/*
          Below `md` the page's chrome row drops these two, so the drawer is
          where they live instead - one row, split down the middle, directly
          above the user menu.
        */}
        <div className="flex items-center px-2 pb-1 md:hidden">
          <div className="flex flex-1 justify-center">
            <ThemeMenuButton
              labels={{
                theme: tSidebar('theme'),
                light: tSidebar('themeLight'),
                dark: tSidebar('themeDark'),
                system: tSidebar('themeSystem'),
              }}
            />
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex flex-1 justify-center">
            <NotificationsMenu />
          </div>
        </div>

        <UserMenu user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
