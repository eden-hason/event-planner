import { StatsCards, type StatItem } from '@/components/ui/stats-cards';
import { IconUsers, IconUserCheck, IconClock } from '@tabler/icons-react';
import type { GuestStats } from '../types';

export function GuestStatCards({ stats }: { stats: GuestStats }) {
  const { total, confirmed, pending, declined } = stats;

  const items: StatItem[] = [
    {
      label: 'Total Guests',
      status: null,
      value: total,
      secondaryText: 'invited',
      pct: 100,
      icon: <IconUsers className="h-4 w-4 text-muted-foreground" />,
      barColor: 'bg-primary',
      activeRing: 'ring-2 ring-primary',
      breakdown: [
        { label: 'Confirmed', value: confirmed, color: 'bg-emerald-500' },
        { label: 'Pending', value: pending, color: 'bg-amber-400' },
        { label: 'Declined', value: declined, color: 'bg-red-400' },
      ],
    },
    {
      label: 'Confirmed',
      status: 'confirmed',
      value: confirmed,
      secondaryText: total > 0 ? `of ${total}` : undefined,
      pct: total > 0 ? Math.round((confirmed / total) * 100) : 0,
      icon: <IconUserCheck className="h-4 w-4 text-emerald-500" />,
      barColor: 'bg-emerald-500',
      activeRing: 'ring-2 ring-emerald-500',
    },
    {
      label: 'Pending',
      status: 'pending',
      value: pending,
      secondaryText: total > 0 ? `of ${total}` : undefined,
      pct: total > 0 ? Math.round((pending / total) * 100) : 0,
      icon: <IconClock className="h-4 w-4 text-amber-500" />,
      barColor: 'bg-amber-400',
      activeRing: 'ring-2 ring-amber-400',
    },
  ];

  return <StatsCards stats={items} columns={3} />;
}
