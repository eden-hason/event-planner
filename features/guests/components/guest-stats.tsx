'use client';

import { useMemo } from 'react';
import { IconClock, IconUserCheck, IconUsers, IconUserX } from '@tabler/icons-react';
import { GuestWithGroupApp } from '../schemas';
import { StatsCards, StatItem } from '@/components/ui/stats-cards';

interface GuestStatsProps {
  guests: GuestWithGroupApp[];
  selectedStatuses?: string[];
  onStatClick?: (status: string | null) => void;
}

export function GuestStats({ guests, selectedStatuses = [], onStatClick }: GuestStatsProps) {
  const stats = useMemo<StatItem[]>(() => {
    const totalRecords = guests.length;
    const totalPeople = guests.reduce((s, g) => s + g.amount, 0);

    const confirmed = guests.filter((g) => g.rsvpStatus === 'confirmed');
    const pending = guests.filter((g) => g.rsvpStatus === 'pending');
    const declined = guests.filter((g) => g.rsvpStatus === 'declined');

    const pct = (n: number) =>
      totalRecords > 0 ? Math.round((n / totalRecords) * 100) : 0;

    return [
      {
        label: 'Total Guests',
        status: null,
        value: totalRecords,
        secondaryText: `${totalPeople.toLocaleString()} people`,
        pct: 100,
        icon: <IconUsers size={16} className="text-blue-500" />,
        barColor: 'bg-blue-500',
        activeRing: 'ring-2 ring-blue-400',
      },
      {
        label: 'Confirmed',
        status: 'confirmed',
        value: confirmed.length,
        secondaryText: `${confirmed.reduce((s, g) => s + g.amount, 0).toLocaleString()} people`,
        pct: pct(confirmed.length),
        icon: <IconUserCheck size={16} className="text-green-500" />,
        barColor: 'bg-green-500',
        activeRing: 'ring-2 ring-green-400',
      },
      {
        label: 'Pending',
        status: 'pending',
        value: pending.length,
        secondaryText: `${pending.reduce((s, g) => s + g.amount, 0).toLocaleString()} people`,
        pct: pct(pending.length),
        icon: <IconClock size={16} className="text-amber-400" />,
        barColor: 'bg-amber-400',
        activeRing: 'ring-2 ring-amber-400',
      },
      {
        label: 'Declined',
        status: 'declined',
        value: declined.length,
        secondaryText: `${declined.reduce((s, g) => s + g.amount, 0).toLocaleString()} people`,
        pct: pct(declined.length),
        icon: <IconUserX size={16} className="text-red-500" />,
        barColor: 'bg-red-500',
        activeRing: 'ring-2 ring-red-400',
      },
    ];
  }, [guests]);

  if (guests.length === 0) return null;

  return (
    <StatsCards
      stats={stats}
      selectedStatuses={selectedStatuses}
      onStatClick={onStatClick}
    />
  );
}
