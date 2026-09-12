'use client';

import { useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import {
  IconCalendar,
  IconCalendarFilled,
  IconDashboard,
  IconDashboardFilled,
  IconDots,
  IconDotsFilled,
  IconListDetails,
  IconListDetailsFilled,
  IconUsers,
} from '@tabler/icons-react';
import {
  MobileTabBar,
  type MobileTabBarItem,
} from '@/components/layout/mobile-tab-bar';
import { useCollaboration } from '@/components/feature-layout';
import { isGuestImportRoute } from './app-shell';
import { useMoreNavItems } from './more-nav-items';
import { buildNavUrl, getEventIdFromPathname } from './nav-urls';

const SEATING_MANAGER_ALLOWED = new Set(['dashboard', 'guests', 'more']);

export function MobileBottomNav() {
  const pathname = usePathname();
  const eventId = getEventIdFromPathname(pathname);
  const tNav = useTranslations('navigation');
  const { isOwner } = useCollaboration();
  // Only to decide whether the tab has anywhere to lead - the "More" page owns
  // the rendering of the tools themselves.
  const moreItems = useMoreNavItems();

  // The guest-import wizard is a full-screen takeover with its own sticky
  // footer sitting exactly where this nav would - see `isGuestImportRoute`.
  if (isGuestImportRoute(pathname)) {
    return null;
  }

  // Without an event there is nowhere for the tabs to lead, so they stay inert
  // rather than linking back to a route that cannot resolve.
  const disabled = !eventId;

  const primaryItems: MobileTabBarItem[] = [
    {
      value: 'dashboard',
      label: tNav('dashboard'),
      icon: IconDashboard,
      activeIcon: IconDashboardFilled,
      href: buildNavUrl('/app/dashboard', eventId),
      disabled,
    },
    {
      value: 'eventDetails',
      label: tNav('eventDetails'),
      icon: IconListDetails,
      activeIcon: IconListDetailsFilled,
      href: buildNavUrl('/app/details', eventId),
      disabled,
    },
    {
      // Tabler has no filled plural-user glyph, so this one opts out of the
      // fill fallback and reads as active through colour and label weight.
      value: 'guests',
      label: tNav('guests'),
      icon: IconUsers,
      activeIcon: IconUsers,
      href: buildNavUrl('/app/guests', eventId),
      disabled,
    },
    {
      value: 'schedules',
      label: tNav('schedules'),
      icon: IconCalendar,
      activeIcon: IconCalendarFilled,
      href: buildNavUrl('/app/schedules', eventId),
      disabled,
    },
  ];

  // Digital Gifting, Share, Seating and the AI assistant live on the "More"
  // page rather than in a popover: it is a full screen, so each tool gets a
  // description and the current event gets a header with its own switcher.
  const moreTab: MobileTabBarItem = {
    value: 'more',
    label: tNav('more'),
    icon: IconDots,
    activeIcon: IconDotsFilled,
    href: buildNavUrl('/app/more', eventId),
    disabled,
  };

  const items = [...primaryItems, ...(moreItems.length > 0 ? [moreTab] : [])]
    .filter((item) => isOwner || SEATING_MANAGER_ALLOWED.has(item.value));

  return <MobileTabBar items={items} />;
}
