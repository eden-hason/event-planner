'use client';

import { useTranslations } from 'next-intl';
import { StatsCards, type StatItem } from '@/components/ui/stats-cards';
import { IconUsers, IconUserCheck, IconClock } from '@tabler/icons-react';
import { rsvpPresentation } from '@/features/guests';
import type { GuestStats } from '../types';

export function GuestStatCards({ stats }: { stats: GuestStats }) {
  const t = useTranslations('dashboard.guestStats');
  const { total, confirmed, pending, declined } = stats;

  const items: StatItem[] = [
    {
      label: t('totalGuests'),
      status: null,
      value: total,
      secondaryText: t('invited'),
      pct: 100,
      icon: <IconUsers className="h-4 w-4 text-muted-foreground" />,
      barColor: 'bg-primary',
      activeRing: 'ring-2 ring-primary',
      breakdown: [
        {
          label: t('confirmed'),
          value: confirmed,
          color: rsvpPresentation('confirmed').solid,
        },
        {
          label: t('pending'),
          value: pending,
          color: rsvpPresentation('pending').solid,
        },
        {
          label: t('declined'),
          value: declined,
          color: rsvpPresentation('declined').solid,
        },
      ],
    },
    {
      label: t('confirmed'),
      status: 'confirmed',
      value: confirmed,
      secondaryText: total > 0 ? t('ofTotal', { total }) : undefined,
      pct: total > 0 ? Math.round((confirmed / total) * 100) : 0,
      icon: (
        <IconUserCheck
          className={`h-4 w-4 ${rsvpPresentation('confirmed').accent}`}
        />
      ),
      barColor: rsvpPresentation('confirmed').solid,
      activeRing: rsvpPresentation('confirmed').activeSurface,
    },
    {
      label: t('pending'),
      status: 'pending',
      value: pending,
      secondaryText: total > 0 ? t('ofTotal', { total }) : undefined,
      pct: total > 0 ? Math.round((pending / total) * 100) : 0,
      icon: (
        <IconClock className={`h-4 w-4 ${rsvpPresentation('pending').accent}`} />
      ),
      barColor: rsvpPresentation('pending').solid,
      activeRing: rsvpPresentation('pending').activeSurface,
    },
  ];

  return <StatsCards stats={items} columns={3} />;
}
