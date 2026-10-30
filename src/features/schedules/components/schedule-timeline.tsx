'use client';

import { useTranslations } from 'next-intl';
import {
  IconBell,
  IconCalendarEvent,
  IconHeart,
  IconMail,
  IconPhone,
  IconUserCheck,
  type IconProps,
} from '@tabler/icons-react';

import { cn } from '@/lib/utils';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { WhatsAppIcon } from '@/components/icons';
import {
  Timeline,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
} from '@/components/ui/timeline';
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
  /** Sits at the end of the list's first title row. */
  headerAction?: React.ReactNode;
}

/**
 * The plan as a timeline: every dated Schedule of the Event in one
 * chronological list, with the day of the Event marked in it.
 *
 * Messages and call rounds share the list rather than sitting in separate
 * menus. The ordering is the whole point - a call that sits between two
 * reminders is part of how the plan works, and two menus made that invisible.
 *
 * Undated Schedules (ADR 0029) have no place on it, so they lead in a group of
 * their own, and each one moves into the timeline once it is given a date.
 */
export function ScheduleTimeline({
  items,
  activeId,
  onSelect,
  dayLabel,
  headerAction,
}: ScheduleTimelineProps) {
  const t = useTranslations('schedules');
  const undated = items.filter((item) => item.undated);
  const dated = items.filter((item) => !item.undated);

  return (
    <div className="flex flex-col gap-5">
      {undated.length > 0 && (
        <TimelineSection
          id="undated-schedules"
          title={t('timeline.undatedTitle')}
          description={t('timeline.undatedHint')}
          action={headerAction}
          lead
        >
          <Timeline value={0} role="list" className="gap-2">
            {undated.map((item, index) => (
              <TimelineCard
                key={item.id}
                step={index + 1}
                item={item}
                isActive={item.id === activeId}
                onSelect={onSelect}
              />
            ))}
          </Timeline>
        </TimelineSection>
      )}
      {dated.length > 0 && (
        <TimelineSection
          id="dated-schedules"
          title={t('timeline.datedTitle')}
          action={headerAction}
          lead={undated.length === 0}
        >
          <DatedTimeline
            items={dated}
            activeId={activeId}
            onSelect={onSelect}
            dayLabel={dayLabel}
          />
        </TimelineSection>
      )}
    </div>
  );
}

/**
 * One group of the list - its title, an optional line under it, and its cards -
 * on a Card with the card's own surface taken away, so the header parts keep
 * their slots without boxing the cards in a second frame.
 *
 * The list's first section (`lead`) also carries the header action, and from md
 * up its header is at least the 42px of the open Schedule's tabs beside it, so
 * a title with no line under it sits level with the tab labels. The action
 * stays on the title's row, as the Card's own action slot puts it.
 */
function TimelineSection({
  id,
  title,
  description,
  action,
  lead,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  lead: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card
      role="region"
      aria-labelledby={id}
      className="gap-3 rounded-none border-0 bg-transparent py-0 shadow-none"
    >
      <CardHeader className={cn('gap-0.5 px-0', lead && 'content-center md:min-h-[42px]')}>
        <CardTitle className="text-foreground text-sm leading-normal font-bold">
          <h2 id={id}>{title}</h2>
        </CardTitle>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
        {lead && action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent className="px-0">{children}</CardContent>
    </Card>
  );
}

function DatedTimeline({
  items,
  activeId,
  onSelect,
  dayLabel,
}: ScheduleTimelineProps) {
  const rows = withDayMarker(items);

  // The Timeline lights its rail up to the last step it is told is reached, so
  // that is the last row that has gone out.
  const reached = rows.reduce(
    (last, row, index) =>
      row.kind === 'item' && isDone(row.item.status) ? index + 1 : last,
    0,
  );

  return (
    <Timeline value={reached} role="list" className="gap-2">
      {rows.map((row, index) =>
        row.kind === 'dayMarker' ? (
          <TimelineItem
            key="day-marker"
            step={index + 1}
            role="listitem"
            aria-hidden
            className={RAIL_ITEM}
          >
            <TimelineIndicator className={cn(RAIL_CENTER, 'bg-primary ring-primary/15 size-3.5 border-0 ring-4')} />
            <div className="flex items-center gap-2.5">
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
          />
        ),
      )}
    </Timeline>
  );
}

/**
 * The rail's geometry, where the design's differs from the Timeline's own: the
 * node is a 30px icon circle in a 40px column rather than a 16px dot in a 32px
 * one, and it sits at the middle of its card rather than at the top.
 *
 * Cards are spaced by the list's gap rather than by padding, so each item is
 * exactly its card and "the middle" is 50%. The line between two nodes is two
 * halves: the upper item's separator runs from its node down to its bottom, and
 * the lower item's `before` bridges the gap from above down to its own node.
 * Both turn the design's green once the lower item is reached - the separator
 * through the Timeline's `has-[+[data-completed]]`, the `before` through the
 * item's own `data-completed`.
 */
const RAIL_ITEM =
  'group-data-[orientation=vertical]/timeline:ms-10 group-data-[orientation=vertical]/timeline:not-last:pb-0 has-[+[data-completed]]:**:data-[slot=timeline-separator]:bg-success/30 not-first:before:bg-border not-first:before:absolute not-first:before:-start-[26px] not-first:before:-top-2 not-first:before:h-[calc(50%+0.5rem)] not-first:before:w-0.5 data-completed:not-first:before:bg-success/30';
const RAIL_CENTER =
  'group-data-[orientation=vertical]/timeline:top-1/2 z-10 -translate-y-1/2';
const RAIL_NODE =
  'border-0 flex size-[30px] items-center justify-center group-data-[orientation=vertical]/timeline:-start-10';
const RAIL_LINE =
  'bg-border group-data-[orientation=vertical]/timeline:-start-[26px] group-data-[orientation=vertical]/timeline:top-1/2 group-data-[orientation=vertical]/timeline:h-1/2 group-data-[orientation=vertical]/timeline:translate-y-0';

function isDone(status: OutreachItem['status']) {
  return status === 'sent' || status === 'completed';
}

/**
 * One Schedule: what it is, when, and how it stands - nothing the open pane
 * says better. The rail's node says what kind of outreach it is and, once it
 * has gone out, fills in; the chip is the only place status is told in words.
 * The one line under the title says when and to how many - messages and call
 * rounds alike; how a round is going is the open pane's to tell.
 */
function TimelineCard({
  step,
  item,
  isActive,
  onSelect,
}: {
  step: number;
  item: OutreachItem;
  isActive: boolean;
  onSelect: (id: string) => void;
}) {
  const t = useTranslations('schedules');
  const Icon = typeIcon(item.typeKey);

  return (
    <TimelineItem step={step} role="listitem" className={RAIL_ITEM}>
      {/* The rail: a node per card, joined to the next by a line */}
      <TimelineIndicator
        className={cn(
          RAIL_NODE,
          RAIL_CENTER,
          isDone(item.status)
            ? 'bg-success text-success-foreground'
            : 'bg-muted text-muted-foreground',
        )}
      >
        <Icon className="size-[15px]" />
      </TimelineIndicator>
      <TimelineSeparator className={RAIL_LINE} />

      <Item
        asChild
        variant="outline"
        size="sm"
        className={cn(
          'bg-card w-full cursor-pointer rounded-xl text-start',
          // Below md the list and the open Schedule never share the screen, so
          // nothing in the list reads as selected there.
          isActive ? 'md:border-primary md:shadow-xs' : 'hover:bg-accent/40',
        )}
      >
        <button
          type="button"
          onClick={() => onSelect(item.id)}
          aria-current={isActive ? 'true' : undefined}
        >
          {/* The channel: a message goes out on WhatsApp, a call round by phone */}
          <ItemMedia variant="icon" aria-hidden className="text-muted-foreground rounded-lg">
            {item.kind === 'call' ? <IconPhone /> : <WhatsAppIcon size={16} />}
          </ItemMedia>
          <ItemContent className="min-w-0">
            <ItemTitle className="w-full font-bold">
              <span className="truncate">{item.label}</span>
            </ItemTitle>
            <ItemDescription className="truncate text-xs">
              {description(t, item)}
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <ScheduleStatusChip status={item.status} />
          </ItemActions>
        </button>
      </Item>
    </TimelineItem>
  );
}

function description(
  t: ReturnType<typeof useTranslations<'schedules'>>,
  item: OutreachItem,
): string {
  // A switched-off call has nothing else to report.
  if (item.kind === 'call' && item.status === 'cancelled') return t('timeline.callOff');

  // An undated card's chip already says there is no date.
  const parts = item.status === 'undated' ? [] : [item.listWhen];
  if (item.audienceCount !== null) {
    parts.push(
      t(item.kind === 'call' ? 'timeline.callCount' : 'timeline.recipientCount', {
        count: item.audienceCount,
      }),
    );
  }
  return parts.join(' · ');
}
