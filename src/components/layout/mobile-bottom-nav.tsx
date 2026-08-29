'use client';

import { useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import {
  IconArmchair,
  IconDashboard,
  IconUsers,
  IconUsersGroup,
  IconCalendar,
  IconListDetails,
} from '@tabler/icons-react';
import { Bot } from 'lucide-react';
import { BottomNavBar } from '@/components/ui/bottom-nav-bar';
import { useCollaboration } from '@/components/feature-layout';
import { isSeatingRoute } from './app-shell';

const SEATING_MANAGER_ALLOWED = new Set(['dashboard', 'guests', 'seating', 'aiAssistant']);

function getEventIdFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/app\/([^/]+)/);
  return match ? match[1] : null;
}

function buildNavUrl(basePath: string, eventId: string | null): string {
  if (!eventId) return basePath;
  return basePath.replace(/^\/app\//, `/app/${eventId}/`);
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const eventId = getEventIdFromPathname(pathname);
  const tNav = useTranslations('navigation');
  const tChat = useTranslations('aiChat');
  const { isOwner } = useCollaboration();

  const allItems = [
    { id: 'dashboard', title: tNav('dashboard'), url: buildNavUrl('/app/dashboard', eventId), icon: IconDashboard },
    { id: 'eventDetails', title: tNav('eventDetails'), url: buildNavUrl('/app/details', eventId), icon: IconListDetails },
    { id: 'guests', title: tNav('guests'), url: buildNavUrl('/app/guests', eventId), icon: IconUsers },
    { id: 'schedules', title: tNav('schedules'), url: buildNavUrl('/app/schedules', eventId), icon: IconCalendar },
    { id: 'collaboration', title: tNav('collaboration'), url: buildNavUrl('/app/collaborate', eventId), icon: IconUsersGroup },
    // Without this a Seating Manager - whose entire job is the Seating Plan -
    // could not reach it on a phone at all.
    ...(process.env.NEXT_PUBLIC_ENABLE_SEATING === 'true'
      ? [
          {
            id: 'seating',
            title: tNav('seating'),
            url: buildNavUrl('/app/seating', eventId),
            icon: IconArmchair,
          },
        ]
      : []),
    // The Seating Plan hides the AI assistant launcher (its workspace owns both
    // bottom corners), so the panel is not mounted there - drop the nav entry
    // too rather than leave a button that opens nothing.
    ...(isSeatingRoute(pathname)
      ? []
      : [
          {
            id: 'aiAssistant',
            title: tChat('title'),
            icon: Bot,
            variant: 'featured' as const,
            onClick: () =>
              window.dispatchEvent(new Event('kululu:open-ai-assistant')),
          },
        ]),
  ];

  const items = isOwner
    ? allItems
    : allItems.filter((item) => SEATING_MANAGER_ALLOWED.has(item.id));

  return (
    <div className="fixed inset-x-0 bottom-4 z-20 flex justify-center px-3 md:hidden">
      <BottomNavBar items={items} disabled={!eventId} />
    </div>
  );
}
