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

    const confirmedPeople = confirmed.reduce((s, g) => s + g.amount, 0);
    const pendingPeople = pending.reduce((s, g) => s + g.amount, 0);
    const declinedPeople = declined.reduce((s, g) => s + g.amount, 0);

    const pct = (n: number) =>
      totalRecords > 0 ? Math.round((n / totalRecords) * 100) : 0;

    return [
      {
        label: 'Total Guests',
        people: totalPeople,
        records: totalRecords,
        pct: null,
        icon: Users,
        accent: {
          icon: 'bg-blue-50 text-blue-600',
          bar: null,
          track: null,
          hover: 'hover:border-blue-200',
          pctText: null,
        },
      },
      {
        label: 'Confirmed',
        people: confirmedPeople,
        records: confirmed.length,
        pct: pct(confirmed.length),
        icon: UserCheck,
        accent: {
          icon: 'bg-green-50 text-green-600',
          bar: 'bg-green-500',
          track: 'bg-green-100',
          hover: 'hover:border-green-200',
          pctText: 'text-green-600',
        },
      },
      {
        label: 'Pending',
        people: pendingPeople,
        records: pending.length,
        pct: pct(pending.length),
        icon: Clock,
        accent: {
          icon: 'bg-amber-50 text-amber-600',
          bar: 'bg-amber-400',
          track: 'bg-amber-100',
          hover: 'hover:border-amber-200',
          pctText: 'text-amber-600',
        },
      },
      {
        label: 'Declined',
        people: declinedPeople,
        records: declined.length,
        pct: pct(declined.length),
        icon: UserX,
        accent: {
          icon: 'bg-red-50 text-red-500',
          bar: 'bg-red-400',
          track: 'bg-red-100',
          hover: 'hover:border-red-200',
          pctText: 'text-red-500',
        },
      },
    ];
  }, [guests]);

  if (guests.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-10 lg:grid-cols-4">
      {stats.map(({ label, people, records, pct, icon: Icon, accent }) => (
        <div
          key={label}
          className={cn(
            'bg-card flex flex-col gap-4 rounded-xl border p-5 shadow-sm transition-colors',
            accent.hover,
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
              {label}
            </span>
            <div className={cn('rounded-lg p-1.5', accent.icon)}>
              <Icon className="size-4" strokeWidth={2} />
            </div>
          </div>

          {/* Count */}
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-3xl leading-none font-bold tabular-nums">
                {people}
              </span>
              <span className="text-muted-foreground text-sm">people</span>
            </div>
            <p className="text-muted-foreground/60 mt-1.5 text-xs">
              {records} {records === 1 ? 'record' : 'records'}
            </p>
          </div>

          {/* Response rate bar — RSVP cards only */}
          {pct !== null && accent.bar && accent.track && accent.pctText && (
            <div className="space-y-1.5">
              <div
                className={cn(
                  'h-1 w-full overflow-hidden rounded-full',
                  accent.track,
                )}
              >
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-700',
                    accent.bar,
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p
                className={cn(
                  'text-xs font-medium tabular-nums',
                  accent.pctText,
                )}
              >
                {pct}% of total
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
