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

function formatEventDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function EventHeroBanner({ event }: { event: EventApp }) {
  return (
    <ConfettiBackground
      className="bg-card relative h-full overflow-hidden rounded-xl border p-6 shadow-sm"
      colors={LIGHT_CONFETTI_COLORS}
      count={30}
      gravity={0.02}
    >
      <div className="flex h-full items-center justify-between gap-4">
        <div className="flex flex-col gap-3">
          <h2 className="text-xl leading-tight font-semibold text-zinc-900">
            {event.title}
          </h2>
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
        <img
          src="/hero-wedding-2.svg"
          alt=""
          aria-hidden="true"
          className="h-28 w-auto shrink-0 object-contain select-none"
        />
      </div>
    </ConfettiBackground>
  );
}
