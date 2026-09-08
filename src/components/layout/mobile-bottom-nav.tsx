'use client';

import { type ComponentProps, useId } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import {
  IconArmchair,
  IconCalendar,
  IconCalendarFilled,
  IconDashboard,
  IconDashboardFilled,
  IconDots,
  IconDotsFilled,
  IconGift,
  IconGiftFilled,
  IconListDetails,
  IconListDetailsFilled,
  IconUsers,
  IconUsersGroup,
} from '@tabler/icons-react';
import { Bot } from 'lucide-react';
import {
  MobileTabBar,
  type MobileTabBarHref,
  type MobileTabBarItem,
} from '@/components/ui/mobile-tab-bar';
import { useCollaboration } from '@/components/feature-layout';
import { isSeatingRoute } from './app-shell';

const SEATING_MANAGER_ALLOWED = new Set(['dashboard', 'guests', 'seating', 'aiAssistant']);

const AI_GRADIENT_STOPS = (
  <>
    <stop offset="0%" stopColor="#22d3ee" />
    <stop offset="45%" stopColor="#8b5cf6" />
    <stop offset="100%" stopColor="#d946ef" />
  </>
);

/** Keeps the assistant's gradient glyph now that the bar has no featured variant. */
function AiBotIcon(props: ComponentProps<typeof Bot>) {
  const gradientId = `ai-tab-gradient-${useId().replace(/:/g, '')}`;

  return (
    <Bot {...props} color={`url(#${gradientId})`}>
      <defs>
        <linearGradient
          id={gradientId}
          x1="3"
          y1="3"
          x2="21"
          y2="21"
          gradientUnits="userSpaceOnUse"
        >
          {AI_GRADIENT_STOPS}
        </linearGradient>
      </defs>
    </Bot>
  );
}

function getEventIdFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/app\/([^/]+)/);
  return match ? match[1] : null;
}

function buildNavUrl(basePath: string, eventId: string | null): MobileTabBarHref {
  const url = eventId ? basePath.replace(/^\/app\//, `/app/${eventId}/`) : basePath;
  return url as MobileTabBarHref;
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const eventId = getEventIdFromPathname(pathname);
  const tNav = useTranslations('navigation');
  const tChat = useTranslations('aiChat');
  const { isOwner } = useCollaboration();

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

  // Digital Gifting, Share, Seating and the AI assistant live behind a single
  // "More" launcher so the bar stays down to five slots.
  const moreItems: MobileTabBarItem[] = [
    {
      value: 'gifting',
      label: tNav('gifting'),
      icon: IconGift,
      activeIcon: IconGiftFilled,
      href: buildNavUrl('/app/gifting', eventId),
      disabled,
    },
    {
      value: 'collaboration',
      label: tNav('collaboration'),
      icon: IconUsersGroup,
      href: buildNavUrl('/app/collaborate', eventId),
      disabled,
    },
    // Without this a Seating Manager - whose entire job is the Seating Plan -
    // could not reach it on a phone at all.
    ...(process.env.NEXT_PUBLIC_ENABLE_SEATING === 'true'
      ? [
          {
            value: 'seating',
            label: tNav('seating'),
            icon: IconArmchair,
            href: buildNavUrl('/app/seating', eventId),
            disabled,
          },
        ]
      : []),
    // The Seating Plan hides the AI assistant launcher (its workspace owns both
    // bottom corners), so the panel is not mounted there - drop the entry too
    // rather than leave a button that opens nothing.
    ...(isSeatingRoute(pathname)
      ? []
      : [
          {
            value: 'aiAssistant',
            label: tChat('title'),
            icon: AiBotIcon,
            disabled,
            onClick: () =>
              window.dispatchEvent(new Event('kululu:open-ai-assistant')),
          },
        ]),
  ];

  const allowed = (item: MobileTabBarItem) =>
    isOwner || SEATING_MANAGER_ALLOWED.has(item.value);

  const visiblePrimary = primaryItems.filter(allowed);
  const visibleMore = moreItems.filter(allowed);

  const items: MobileTabBarItem[] = [
    ...visiblePrimary,
    ...(visibleMore.length > 0
      ? [
          {
            value: 'more',
            label: tNav('more'),
            icon: IconDots,
            activeIcon: IconDotsFilled,
            items: visibleMore,
          },
        ]
      : []),
  ];

  return <MobileTabBar items={items} />;
}
