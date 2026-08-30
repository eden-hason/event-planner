'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { IconUserCheck, IconUserQuestion, IconUsers, IconUserX } from '@tabler/icons-react';
import { GuestWithGroupApp } from '../schemas';
import { StatsCards, StatItem } from '@/components/ui/stats-cards';

interface GuestStatsProps {
  guests: GuestWithGroupApp[];
  selectedStatuses?: string[];
  onStatClick?: (status: string | null) => void;
}

export function GuestStats({ guests, selectedStatuses = [], onStatClick }: GuestStatsProps) {
  const t = useTranslations('guests');

  const stats = useMemo<StatItem[]>(() => {
    // A record is one row in the guest list; a guest is one seat at the event, so
    // a single record can carry several guests through its amount. Guests are the
    // headline number here, records the supporting detail.
    const guestCount = (rows: GuestWithGroupApp[]) =>
      rows.reduce((s, g) => s + g.amount, 0);

    const totalRecords = guests.length;
    const totalGuests = guestCount(guests);

    const confirmed = guests.filter((g) => g.rsvpStatus === 'confirmed');
    const pending = guests.filter((g) => g.rsvpStatus === 'pending');
    const declined = guests.filter((g) => g.rsvpStatus === 'declined');

    const pct = (n: number) =>
      totalGuests > 0 ? Math.round((n / totalGuests) * 100) : 0;

    const records = (count: number) =>
      t('stats.records', { count: count.toLocaleString() });

    return [
      {
        label: t('stats.totalGuests'),
        status: null,
        value: totalGuests,
        secondaryText: records(totalRecords),
        pct: 100,
        icon: <IconUsers className="text-blue-500" />,
        barColor: 'bg-blue-500',
        activeRing: 'bg-blue-50 border-blue-300',
      },
      {
        label: t('stats.confirmed'),
        status: 'confirmed',
        value: guestCount(confirmed),
        secondaryText: records(confirmed.length),
        pct: pct(guestCount(confirmed)),
        icon: <IconUserCheck className="text-green-500" />,
        barColor: 'bg-green-500',
        activeRing: 'bg-green-50 border-green-300',
      },
      {
        label: t('stats.pending'),
        status: 'pending',
        value: guestCount(pending),
        secondaryText: records(pending.length),
        pct: pct(guestCount(pending)),
        icon: <IconUserQuestion className="text-amber-400" />,
        barColor: 'bg-amber-400',
        activeRing: 'bg-amber-50 border-amber-300',
      },
      {
        label: t('stats.declined'),
        status: 'declined',
        value: guestCount(declined),
        secondaryText: records(declined.length),
        pct: pct(guestCount(declined)),
        icon: <IconUserX className="text-red-500" />,
        barColor: 'bg-red-500',
        activeRing: 'bg-red-50 border-red-300',
      },
    ];
  }, [guests, t]);

  if (guests.length === 0) return null;

  return (
    <StatsCards
      stats={stats}
      selectedStatuses={selectedStatuses}
      onStatClick={onStatClick}
    />
  );
}
