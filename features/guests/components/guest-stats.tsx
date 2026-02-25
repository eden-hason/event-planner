'use client';

import { useMemo } from 'react';
import { Users, UserCheck, Clock, UserX } from 'lucide-react';
import { GuestWithGroupApp } from '../schemas';
import { cn } from '@/lib/utils';

interface GuestStatsProps {
  guests: GuestWithGroupApp[];
}

export function GuestStats({ guests }: GuestStatsProps) {
  const stats = useMemo(() => {
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
        people: totalPeople,
        records: totalRecords,
        pct: 100,
        icon: Users,
        iconColor: 'text-blue-500',
        barColor: 'bg-blue-500',
      },
      {
        label: 'Confirmed',
        people: confirmed.reduce((s, g) => s + g.amount, 0),
        records: confirmed.length,
        pct: pct(confirmed.length),
        icon: UserCheck,
        iconColor: 'text-green-500',
        barColor: 'bg-green-500',
      },
      {
        label: 'Pending',
        people: pending.reduce((s, g) => s + g.amount, 0),
        records: pending.length,
        pct: pct(pending.length),
        icon: Clock,
        iconColor: 'text-amber-400',
        barColor: 'bg-amber-400',
      },
      {
        label: 'Declined',
        people: declined.reduce((s, g) => s + g.amount, 0),
        records: declined.length,
        pct: pct(declined.length),
        icon: UserX,
        iconColor: 'text-red-500',
        barColor: 'bg-red-500',
      },
    ];
  }, [guests]);

  if (guests.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map(({ label, people, records, pct, icon: Icon, iconColor, barColor }) => (
        <div
          key={label}
          className="bg-card flex flex-col gap-5 rounded-xl border p-5 shadow-sm"
        >
          {/* Header: title + icon */}
          <div className="flex items-center justify-between">
            <span className="text-base font-bold">{label}</span>
            <Icon className={cn('size-5', iconColor)} strokeWidth={2} />
          </div>

          {/* Large number */}
          <p className="text-5xl font-bold leading-none tracking-tight">
            {records.toLocaleString()}
          </p>

          {/* Progress bar + stats row */}
          <div className="space-y-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={cn('h-full rounded-full transition-all duration-700', barColor)}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="text-muted-foreground flex items-center justify-between text-xs">
              <span>{people.toLocaleString()} people</span>
              <span>{pct}%</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
