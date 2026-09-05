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
      variant={isSeatingPage ? 'sidebar' : props.variant}
      // The `ui/sidebar.tsx` primitive hardcodes bg/border/shadow on an inner
      // div its own className prop doesn't reach - this app's sidebar wants
      // none of them, but the shared primitive (also used by the admin back
      // office) shouldn't lose them for every consumer, so it's overridden
      // here via the one class the primitive does expose, targeting its
      // inner div by its `data-sidebar` attribute.
      //
      // `--sidebar-accent` (the hover/active tint every menu button uses) is
      // defined app-wide as the same gray as `--muted` - indistinguishable
      // from the AppShell's own background now that the sidebar itself has
      // no background to show it against. Redefining it locally to white
      // keeps every `bg-sidebar-accent` hover/active class working, but
      // visible, without changing the token for the admin sidebar (still
      // opaque, where gray-on-white already has contrast).
      className={cn(
        '[--sidebar-accent:var(--background)] [&_[data-sidebar=sidebar]]:border-none [&_[data-sidebar=sidebar]]:bg-transparent [&_[data-sidebar=sidebar]]:shadow-none',
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

        <UserMenu user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
