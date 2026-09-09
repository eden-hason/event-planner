'use client';

import { type ComponentProps, type ElementType, useId } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import { IconArmchair, IconGift, IconUsersGroup } from '@tabler/icons-react';
import { Bot } from 'lucide-react';
import { useCollaboration } from '@/components/feature-layout';
import { isSeatingRoute } from './app-shell';
import { buildNavUrl, getEventIdFromPathname, type NavHref } from './nav-urls';

/**
 * What a Seating Manager is allowed to see. Everything else in the app belongs
 * to the owner, so the collaborator's "More" page is a shorter list rather
 * than a wall of rows that all refuse to open.
 */
const SEATING_MANAGER_ALLOWED = new Set(['seating', 'aiAssistant']);

const AI_GRADIENT_STOPS = (
  <>
    <stop offset="0%" stopColor="#22d3ee" />
    <stop offset="45%" stopColor="#8b5cf6" />
    <stop offset="100%" stopColor="#d946ef" />
  </>
);

/** Keeps the assistant's gradient glyph wherever the entry is listed. */
export function AiBotIcon(props: ComponentProps<typeof Bot>) {
  const gradientId = `ai-more-gradient-${useId().replace(/:/g, '')}`;

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

export type MoreNavItem = {
  /** Stable id, also the key both translation lookups are keyed by. */
  value: string;
  label: string;
  description: string;
  icon: ElementType;
  /**
   * Tailwind classes for the row's icon tile. Each tool gets its own hue, per
   * the design - the tint is what makes a long list scannable at a glance.
   */
  tint: string;
  /** Rows that navigate. Omit it for rows that only run `onClick`. */
  href?: NavHref;
  onClick?: () => void;
};

/**
 * The tools that live behind the mobile "More" tab.
 *
 * Shared by the tab bar - which only needs to know whether the tab has
 * anything behind it - and the "More" page, which renders them. Keeping one
 * list means the tab can never appear over an empty page, or hide a tool the
 * page would have shown.
 */
export function useMoreNavItems(): MoreNavItem[] {
  const pathname = usePathname();
  const eventId = getEventIdFromPathname(pathname);
  const tNav = useTranslations('navigation');
  const tMore = useTranslations('more.descriptions');
  const tChat = useTranslations('aiChat');
  const { isOwner } = useCollaboration();

  const items: MoreNavItem[] = [
    {
      value: 'gifting',
      label: tNav('gifting'),
      description: tMore('gifting'),
      icon: IconGift,
      tint: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300',
      href: buildNavUrl('/app/gifting', eventId),
    },
    {
      value: 'collaboration',
      label: tNav('collaboration'),
      description: tMore('collaboration'),
      icon: IconUsersGroup,
      tint: 'bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300',
      href: buildNavUrl('/app/collaborate', eventId),
    },
    // Without this a Seating Manager - whose entire job is the Seating Plan -
    // could not reach it on a phone at all.
    ...(process.env.NEXT_PUBLIC_ENABLE_SEATING === 'true'
      ? [
          {
            value: 'seating',
            label: tNav('seating'),
            description: tMore('seating'),
            icon: IconArmchair,
            tint: 'bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300',
            href: buildNavUrl('/app/seating', eventId),
          },
        ]
      : []),
    // The Seating Plan hides the AI assistant launcher (its workspace owns both
    // bottom corners), so the panel is not mounted there - drop the entry too
    // rather than leave a row that opens nothing.
    ...(isSeatingRoute(pathname)
      ? []
      : [
          {
            value: 'aiAssistant',
            label: tChat('title'),
            description: tMore('aiAssistant'),
            icon: AiBotIcon,
            tint: 'bg-fuchsia-100 dark:bg-fuchsia-400/15',
            onClick: () =>
              window.dispatchEvent(new Event('kululu:open-ai-assistant')),
          },
        ]),
  ];

  return isOwner
    ? items
    : items.filter((item) => SEATING_MANAGER_ALLOWED.has(item.value));
}
