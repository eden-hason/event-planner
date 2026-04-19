'use client';

import { useTranslations } from 'next-intl';
import { StatsCards, type StatItem } from '@/components/ui/stats-cards';
import { IconUsers, IconUserCheck, IconClock } from '@tabler/icons-react';
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
        { label: t('confirmed'), value: confirmed, color: 'bg-emerald-500' },
        { label: t('pending'), value: pending, color: 'bg-amber-400' },
        { label: t('pending'), value: declined, color: 'bg-red-400' },
      ],
    },
    {
      label: t('confirmed'),
      status: 'confirmed',
      value: confirmed,
      secondaryText: total > 0 ? t('ofTotal', { total }) : undefined,
      pct: total > 0 ? Math.round((confirmed / total) * 100) : 0,
      icon: <IconUserCheck className="h-4 w-4 text-emerald-500" />,
      barColor: 'bg-emerald-500',
      activeRing: 'ring-2 ring-emerald-500',
    },
    {
      label: t('pending'),
      status: 'pending',
      value: pending,
      secondaryText: total > 0 ? t('ofTotal', { total }) : undefined,
      pct: total > 0 ? Math.round((pending / total) * 100) : 0,
      icon: <IconClock className="h-4 w-4 text-amber-500" />,
      barColor: 'bg-amber-400',
      activeRing: 'ring-2 ring-amber-400',
    },
  ];

  return <StatsCards stats={items} columns={3} />;
}
