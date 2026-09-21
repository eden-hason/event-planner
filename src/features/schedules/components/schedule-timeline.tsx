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
import {
  Timeline,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
} from '@/components/ui/timeline';
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

  // The Timeline lights its rail up to the last step it is told is reached, so
  // that is the last row that has gone out.
  const reached = rows.reduce(
    (last, row, index) =>
      row.kind === 'item' && isDone(row.item.status) ? index + 1 : last,
    0,
  );

  return (
    <Timeline value={reached} role="list">
      {rows.map((row, index) =>
        row.kind === 'dayMarker' ? (
          <TimelineItem
            key="day-marker"
            step={index + 1}
            role="listitem"
            aria-hidden
            className={RAIL_ITEM}
          >
            <TimelineIndicator className="bg-primary ring-primary/15 top-0.5 size-3.5 border-0 ring-4" />
            <div className="flex items-center gap-2.5 pt-0.5">
              <span className="border-primary/30 h-0 flex-1 border-t-2 border-dashed" />
              <span className="text-primary text-xs font-bold whitespace-nowrap">
                {dayLabel}
              </span>
            </div>
          </TimelineItem>
        ) : (
          <TimelineCard
            key={row.item.id}
            step={index + 1}
            item={row.item}
            isActive={row.item.id === activeId}
            onSelect={onSelect}
            offsetLabel={offsetLabel(t, row.item.offset)}
          />
        ),
      )}
    </Timeline>
  );
}

/**
 * The rail's geometry, where the design's differs from the Timeline's own: the
 * node is a 30px icon circle in a 40px column rather than a 16px dot in a 32px
 * one, and the line runs from just under the node to the next one. The
 * `has-[+[data-completed]]` line is the Timeline's "reached" colour, kept for
 * the same idea in the design's green.
 */
const RAIL_ITEM =
  'group-data-[orientation=vertical]/timeline:ms-10 group-data-[orientation=vertical]/timeline:not-last:pb-3 has-[+[data-completed]]:**:data-[slot=timeline-separator]:bg-success/30';
const RAIL_NODE =
  'border-card group-data-completed/timeline-item:border-card flex size-[30px] items-center justify-center group-data-[orientation=vertical]/timeline:-start-10';
const RAIL_LINE =
  'bg-border group-data-[orientation=vertical]/timeline:-start-[26px] group-data-[orientation=vertical]/timeline:h-[calc(100%-34px)] group-data-[orientation=vertical]/timeline:translate-y-[34px]';

function isDone(status: OutreachItem['status']) {
  return status === 'sent' || status === 'completed';
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
  step,
  item,
  isActive,
  onSelect,
  offsetLabel,
}: {
  step: number;
  item: OutreachItem;
  isActive: boolean;
  onSelect: (id: string) => void;
  offsetLabel: string | null;
}) {
  const t = useTranslations('schedules');
  const Icon = typeIcon(item.typeKey);
  const done = isDone(item.status);
  const live = item.status === 'in_progress';
  const muted =
    item.status === 'locked' ||
    item.status === 'cancelled' ||
    item.status === 'expired';

  return (
    <TimelineItem step={step} role="listitem" className={RAIL_ITEM}>
      {/* The rail: a node per card, joined to the next by a line */}
      <TimelineIndicator
        className={cn(
          RAIL_NODE,
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
      </TimelineIndicator>
      <TimelineSeparator className={RAIL_LINE} />

      <button
        type="button"
        onClick={() => onSelect(item.id)}
        aria-current={isActive ? 'true' : undefined}
        className={cn(
          'bg-card flex min-w-0 cursor-pointer flex-col gap-2 rounded-xl border p-3 text-start transition-colors',
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
    </TimelineItem>
  );
}
