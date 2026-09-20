'use client';

import { useTranslations } from 'next-intl';
import {
  IconBell,
  IconCalendarEvent,
  IconHeart,
  IconMail,
  IconPhone,
  IconUserCheck,
  IconUsers,
  type IconProps,
} from '@tabler/icons-react';

import { cn } from '@/lib/utils';
import { CallProgressBar } from '@/features/calls';
import type { ScheduleTypeKey } from '../schemas';
import type { OutreachItem } from '../types';
import { withDayMarker } from '../utils/timeline';
import { ScheduleStatusChip } from './schedule-status-chip';

type ScheduleTypeIcon = React.ComponentType<IconProps>;

const TYPE_ICONS: Record<ScheduleTypeKey, ScheduleTypeIcon> = {
  initial_invitation: IconMail,
  confirmation: IconUserCheck,
  event_reminder: IconBell,
  post_event: IconHeart,
  phone_call: IconPhone,
};

// Any schedule type outside the five known here (e.g. one added directly to
// the schedule_types table) falls back to a generic icon rather than crashing.
function typeIcon(typeKey: string): ScheduleTypeIcon {
  return (
    (TYPE_ICONS as Partial<Record<string, ScheduleTypeIcon>>)[typeKey] ??
    IconCalendarEvent
  );
}

interface ScheduleTimelineProps {
  items: OutreachItem[];
  /** The Schedule whose pane is open, if any. */
  activeId: string | null;
  onSelect: (id: string) => void;
  /** Formatted label for the "day of the event" divider. */
  dayLabel: string;
}

/**
 * The plan as a timeline: every Schedule of the Event in one chronological
 * list, with the day of the Event marked in it.
 *
 * Messages and call rounds share the list rather than sitting in separate
 * menus. The ordering is the whole point - a call that sits between two
 * reminders is part of how the plan works, and two menus made that invisible.
 */
export function ScheduleTimeline({
  items,
  activeId,
  onSelect,
  dayLabel,
}: ScheduleTimelineProps) {
  const t = useTranslations('schedules');
  const rows = withDayMarker(items);

  return (
    <ol className="flex flex-col">
      {rows.map((row, index) =>
        row.kind === 'dayMarker' ? (
          <li
            key="day-marker"
            className="flex items-center gap-2.5 py-1 pb-3.5"
            aria-hidden
          >
            <span className="flex w-[30px] justify-center">
              <span className="bg-primary ring-primary/15 size-3.5 rounded-full ring-4" />
            </span>
            <span className="border-primary/30 h-0 flex-1 border-t-2 border-dashed" />
            <span className="text-primary text-xs font-bold whitespace-nowrap">
              {dayLabel}
            </span>
          </li>
        ) : (
          <TimelineCard
            key={row.item.id}
            item={row.item}
            isActive={row.item.id === activeId}
            isLast={index === rows.length - 1}
            onSelect={onSelect}
            offsetLabel={offsetLabel(t, row.item.offset)}
          />
        ),
      )}
    </ol>
  );
}

function offsetLabel(
  t: ReturnType<typeof useTranslations<'schedules'>>,
  offset: number | null,
): string | null {
  if (offset === null) return null;
  if (offset === 0) return t('timeline.dayOf');
  if (offset < 0) return t('timeline.daysBefore', { count: Math.abs(offset) });
  return t('timeline.daysAfter', { count: offset });
}

function TimelineCard({
  item,
  isActive,
  isLast,
  onSelect,
  offsetLabel,
}: {
  item: OutreachItem;
  isActive: boolean;
  isLast: boolean;
  onSelect: (id: string) => void;
  offsetLabel: string | null;
}) {
  const t = useTranslations('schedules');
  const Icon = typeIcon(item.typeKey);
  const done = item.status === 'sent' || item.status === 'completed';
  const live = item.status === 'in_progress';
  const muted =
    item.status === 'locked' ||
    item.status === 'cancelled' ||
    item.status === 'expired';

  return (
    <li className="relative flex gap-2.5 pb-3">
      {/* The rail: a node per card, joined by a line that stops at the last one */}
      <div className="relative flex w-[30px] shrink-0 justify-center">
        {!isLast && (
          <span
            aria-hidden
            className={cn(
              'absolute top-[34px] -bottom-3 w-0.5',
              done ? 'bg-success/30' : 'bg-border',
            )}
          />
        )}
        <span
          aria-hidden
          className={cn(
            'border-card relative z-10 flex size-[30px] items-center justify-center rounded-full border-2',
            done
              ? 'bg-success text-success-foreground'
              : live
                ? 'bg-info-solid text-white'
                : muted
                  ? 'bg-muted text-muted-foreground'
                  : 'bg-primary/10 text-primary',
          )}
        >
          <Icon className="size-[15px]" />
        </span>
      </div>

      <button
        type="button"
        onClick={() => onSelect(item.id)}
        aria-current={isActive ? 'true' : undefined}
        className={cn(
          'bg-card flex min-w-0 flex-1 cursor-pointer flex-col gap-2 rounded-xl border p-3 text-start transition-colors',
          'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
          isActive ? 'border-primary shadow-xs' : 'hover:bg-accent/40',
          done && !isActive && 'border-success/25',
          live && !isActive && 'border-info-tint-border',
        )}
      >
        <div className="flex w-full items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span
              className={cn(
                'truncate text-[15px] font-bold',
                muted ? 'text-muted-foreground' : 'text-foreground',
              )}
            >
              {item.label}
            </span>
            <span className="text-muted-foreground truncate text-xs">
              {t(item.kind === 'call' ? 'kind.call' : 'kind.message')}
              {offsetLabel ? ` · ${offsetLabel}` : ''} · {item.when}
            </span>
          </div>
          <ScheduleStatusChip status={item.status} />
        </div>

        <div className="flex w-full flex-wrap items-center gap-1.5">
          <span className="bg-muted text-muted-foreground inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11.5px]">
            <IconUsers className="text-primary size-3" />
            {item.audience}
          </span>
          {item.audienceCount !== null && (
            <span className="text-muted-foreground text-[11.5px]">
              {t(
                item.kind === 'call'
                  ? 'timeline.callCount'
                  : 'timeline.recipientCount',
                { count: item.audienceCount },
              )}
            </span>
          )}
          {item.callProgress && (
            <span
              className={cn(
                'ms-auto text-[11.5px] font-bold',
                live ? 'text-info-strong' : 'text-success',
              )}
            >
              {live
                ? t('timeline.callLiveStat', {
                    confirmed: item.callProgress.confirmed,
                    awaiting: item.callProgress.awaiting,
                  })
                : t('timeline.callDoneStat', {
                    confirmed: item.callProgress.confirmed,
                    noAnswer: item.callProgress.noAnswer,
                  })}
            </span>
          )}
          {item.miniStat && (
            <span className="text-success ms-auto text-[11.5px] font-bold">
              {t(
                item.miniStat.kind === 'read'
                  ? 'timeline.readRate'
                  : 'timeline.reachedRate',
                { percent: item.miniStat.percent },
              )}
            </span>
          )}
        </div>

        {item.callProgress && <CallProgressBar counts={item.callProgress} />}

        {/* A switched-off call has nothing to report in the row above. */}
        {item.kind === 'call' && item.status === 'cancelled' && (
          <p className="text-muted-foreground text-xs leading-relaxed">{t('timeline.callOff')}</p>
        )}
      </button>
    </li>
  );
}
