import { ConfettiBackground } from '@/components/ui/confetti';
import { IconCalendar, IconMapPin } from '@tabler/icons-react';
import type { EventApp } from '@/features/events/schemas';

const LIGHT_CONFETTI_COLORS = [
  'rgba(244, 114, 182, 0.35)',
  'rgba(192, 132, 252, 0.35)',
  'rgba(129, 140, 248, 0.35)',
  'rgba(96, 165, 250, 0.35)',
  'rgba(45, 212, 191, 0.3)',
  'rgba(251, 191, 36, 0.3)',
  'rgba(248, 113, 113, 0.3)',
];

function getDaysRemaining(eventDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const event = new Date(eventDate);
  event.setHours(0, 0, 0, 0);
  return Math.ceil((event.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatEventDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}


export function EventHeroBanner({ event }: { event: EventApp }) {
  const daysRemaining = getDaysRemaining(event.eventDate);
  const isPast = daysRemaining < 0;
  const isToday = daysRemaining === 0;
  const countdownValue = isToday ? '🎉' : Math.abs(daysRemaining).toString();
  const countdownLabel = isToday ? "Today's the day!" : isPast ? 'days since' : 'days to go';

  return (
    <ConfettiBackground
      className="relative rounded-xl border bg-card p-6 shadow-sm"
      colors={LIGHT_CONFETTI_COLORS}
      count={30}
      gravity={0.02}
    >
      <div className="flex items-center justify-between gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-2">
            <h2 className="text-xl font-semibold leading-tight text-zinc-900">{event.title}</h2>
          </div>
          <div className="space-y-1.5 text-sm text-zinc-500">
            <div className="flex items-center gap-2">
              <IconCalendar className="h-4 w-4 shrink-0" />
              <span>{formatEventDate(event.eventDate)}</span>
            </div>
            {event.location?.name && (
              <div className="flex items-center gap-2">
                <IconMapPin className="h-4 w-4 shrink-0" />
                <span className="truncate">{event.location.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Countdown */}
        <div className="shrink-0 rounded-xl bg-white/80 px-6 py-4 text-center text-zinc-900 shadow-sm backdrop-blur-sm">
          <p className="text-4xl font-bold tabular-nums leading-none">{countdownValue}</p>
          <p className="mt-1.5 text-xs text-zinc-500">{countdownLabel}</p>
        </div>
      </div>
    </ConfettiBackground>
  );
}
