import Link from 'next/link';
import { ClockAlert, MessageSquareX, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Signal, SignalKind } from '../types';

/**
 * Severity is carried by icon shape, weight and order - not by three alarm
 * colours. The system has --destructive and --success and no --warning, and a
 * page where everything is red teaches the Operator to scroll past it. Only the
 * two failure kinds take colour; a stale round is bookkeeping and stays grey.
 */
const KIND: Record<
  SignalKind,
  { icon: typeof ClockAlert; tone: string; weight: string; label: string }
> = {
  overdue_schedule: {
    icon: ClockAlert,
    tone: 'text-destructive',
    weight: 'font-semibold',
    label: 'Overdue schedule',
  },
  failed_delivery: {
    icon: MessageSquareX,
    tone: 'text-destructive',
    weight: 'font-medium',
    label: 'Failed delivery',
  },
  stale_call_round: {
    icon: Phone,
    tone: 'text-muted-foreground',
    weight: 'font-medium',
    label: 'Stale call round',
  },
};

function age(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'} ago`;
}

export function SignalRow({ signal }: { signal: Signal }) {
  const { icon: Icon, tone, weight, label } = KIND[signal.kind];

  return (
    <Link
      href={signal.href}
      className="hover:bg-accent focus-visible:ring-ring flex items-start gap-3 border-t px-4 py-3 transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      <Icon className={cn('mt-0.5 size-[18px] shrink-0', tone)} aria-hidden />
      <span className="sr-only">{label}:</span>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn('truncate text-sm', weight)}>
          {signal.headline} - {signal.eventTitle}
        </span>
        <span className="text-muted-foreground truncate text-[13px]">
          {signal.detail}
        </span>
      </div>

      <span className="text-muted-foreground mt-px shrink-0 text-[13px] whitespace-nowrap tabular-nums">
        {age(signal.occurredAt)}
      </span>
    </Link>
  );
}
