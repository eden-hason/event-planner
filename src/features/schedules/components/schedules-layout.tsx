'use client';

import { useCallback, useEffect, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import { setSearchParams } from '@/lib/shallow-navigation';
import { ADMIN_TIME_ZONE } from '@/lib/date-time';
import { Separator } from '@/components/ui/separator';
import { useFeatureLayoutContext } from '@/components/feature-layout';
import { useIsMobile } from '@/hooks/use-mobile';

import type { OutreachItem } from '../types';
import type { HeroModel } from '../utils/hero';
import { ScheduleStatusChip } from './schedule-status-chip';
import { ScheduleTimeline } from './schedule-timeline';
import { SchedulesHero } from './schedules-hero';
import {
  UnsavedChangesProvider,
  useUnsavedChangesGuard,
} from './unsaved-changes-guard';

/** The query parameter that addresses the open Schedule. */
const PARAM = 'schedule';

interface SchedulesLayoutProps {
  items: OutreachItem[];
  hero: HeroModel;
  /** The header's line under the title: which set this is, and its size. */
  subtitle: string;
  eventId: string;
  eventDate: string | null;
  /** How a WhatsApp message reaches the guest, a pill in the timeline header. */
  deliveryInfo?: ReactNode;
}

/**
 * The schedules page: a timeline, and one Schedule open beside or over it.
 *
 * The open Schedule lives in `?schedule=<id>` rather than in component state.
 * Below `md` the pane is the whole screen with a back arrow, and a fake back
 * arrow is the reason: with the selection in `useState`, Android's hardware
 * back button would leave the page entirely instead of returning to the
 * timeline. In the URL, both back gestures do the obvious thing and a pane can
 * be linked to.
 *
 * At `md` and up the timeline stays put and the pane renders beside it, so
 * there is one information architecture at both sizes.
 */
export function SchedulesLayout({
  items,
  hero,
  subtitle,
  eventId,
  eventDate,
  deliveryInfo,
}: SchedulesLayoutProps) {
  const t = useTranslations('schedules');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const { setHeader, clearHeader } = useFeatureLayoutContext();

  const openId = searchParams.get(PARAM);
  // An id that no longer resolves (a stale link, a deleted Schedule) falls back
  // to the timeline rather than to a blank pane.
  const openItem = items.find((item) => item.id === openId) ?? null;
  // The wide layout always has something in the pane; the narrow one shows the
  // pane only when the organiser opened it. Unasked, it shows the latest thing
  // that went out - what the Owner most likely came to check on - or, before
  // anything has, the plan's first Schedule. A round being called counts as
  // gone out, as it does in the hero.
  const lastSent = items.findLast(
    (item) =>
      item.status === 'sent' ||
      item.status === 'completed' ||
      item.status === 'in_progress',
  );
  const paneItem = openItem ?? lastSent ?? items[0] ?? null;

  // Moving to another Schedule, or back to the timeline, unmounts the open one,
  // so either asks first while it has unsaved edits.
  const { guard, report, dialog } = useUnsavedChangesGuard();

  // Shallow: every pane is already in `items`, and the server never reads the
  // param, so a router navigation would only wait for an identical payload.
  const select = useCallback(
    (id: string) =>
      guard(() => setSearchParams((params) => params.set(PARAM, id))),
    [guard],
  );

  const close = useCallback(
    () => guard(() => setSearchParams((params) => params.delete(PARAM))),
    [guard],
  );

  // Below md an open Schedule is the whole screen, so the app header stops
  // naming the page and names the Schedule instead - what it is, when, and how
  // it stands - with the arrow back to the timeline. From md up the timeline
  // stays beside the pane, so the header keeps naming the page and the pane
  // has no title row - the selected card in the timeline already names it.
  const isMobile = useIsMobile();
  const headerItem = isMobile ? openItem : null;
  useEffect(() => {
    if (headerItem) {
      setHeader({
        title: headerItem.label,
        subtitle: `${t(
          headerItem.kind === 'call' ? 'kind.call' : 'kind.message',
        )} · ${headerItem.whenDetailed}`,
        action: <ScheduleStatusChip status={headerItem.status} size="md" />,
        back: { label: t('detail.back'), onClick: close },
      });
    } else {
      setHeader({ title: t('header.title'), subtitle });
    }
    return () => clearHeader();
  }, [setHeader, clearHeader, t, subtitle, headerItem, close]);

  const dayLabel = eventDate
    ? t('timeline.eventDay', {
        date: new Intl.DateTimeFormat(locale, {
          timeZone: ADMIN_TIME_ZONE,
          day: 'numeric',
          month: 'short',
        }).format(new Date(eventDate)),
      })
    : t('timeline.eventDayUndated');

  return (
    <UnsavedChangesProvider report={report}>
      <div className="flex flex-col gap-4 md:gap-6">
        {/* The hero spans both columns from md up. Below md an open Schedule is
          the whole screen, so the hero yields with the timeline. */}
        <div className={cn(openItem && 'hidden md:block')}>
          <SchedulesHero model={hero} eventId={eventId} onOpen={select} />
        </div>

        {/* From md the columns sit 8px either side of the divider, so list and pane
            are as far apart as the pane's own columns (16px). */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-2">
          {/* The timeline. Below md it yields the screen to an open pane; at md and
          up it stays in view while a long pane scrolls, and scrolls on its own
          when it is taller than the viewport. It stays narrow until xl - the
          hero's own break - so a smaller desktop gives its width to the pane. */}
          <div
            className={cn(
              'flex min-w-0 flex-col gap-4 md:w-72 md:shrink-0 xl:w-96',
              'md:sticky md:top-4 md:max-h-[calc(100svh-2rem)] md:overflow-y-auto',
              openItem && 'hidden md:flex',
            )}
          >
            <ScheduleTimeline
              items={items}
              activeId={paneItem?.id ?? null}
              onSelect={select}
              dayLabel={dayLabel}
              headerAction={deliveryInfo}
            />
          </div>

          <Separator
            orientation="vertical"
            className="hidden h-auto self-stretch md:block"
          />

          {/* The open Schedule. Below md this is the whole screen. */}
          <div className={cn('min-w-0 flex-1', !openItem && 'hidden md:block')}>
            {paneItem && (
              <div className="flex flex-col gap-4">{paneItem.details}</div>
            )}
          </div>
        </div>
      </div>
      {dialog}
    </UnsavedChangesProvider>
  );
}
