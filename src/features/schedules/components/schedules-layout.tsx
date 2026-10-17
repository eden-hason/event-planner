'use client';

import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import { setSearchParams } from '@/lib/shallow-navigation';
import { ADMIN_TIME_ZONE } from '@/lib/date-time';
import { Separator } from '@/components/ui/separator';
import { useFeatureLayoutContext } from '@/components/feature-layout';
import { useHideBottomNav } from '@/components/layout/bottom-nav-context';
import { useIsMobile } from '@/hooks/use-mobile';

import type { OutreachItem } from '../types';
import type { HeroModel } from '../utils/hero';
import { ScheduleStatusChip } from './schedule-status-chip';
import { ScheduleTimeline } from './schedule-timeline';
import { SchedulesHero } from './schedules-hero';

/** The query parameter that addresses the open Schedule. */
const PARAM = 'schedule';

interface SchedulesLayoutProps {
  items: OutreachItem[];
  hero: HeroModel;
  /** The header's line under the title: which set this is, and its size. */
  subtitle: string;
  eventId: string;
  eventDate: string | null;
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
  // pane only when the organiser opened it.
  const paneItem = openItem ?? items[0] ?? null;

  // An open message is a full screen with its own Save at the bottom edge, so
  // it takes over from the bottom nav. A call round has no Save - it is watched,
  // not edited - and keeps the nav so the Owner can move on from it.
  useHideBottomNav(openItem?.kind === 'message');

  // Shallow: every pane is already in `items`, and the server never reads the
  // param, so a router navigation would only wait for an identical payload.
  const select = useCallback((id: string) => {
    setSearchParams((params) => params.set(PARAM, id));
  }, []);

  const close = useCallback(() => {
    setSearchParams((params) => params.delete(PARAM));
  }, []);

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
    <div className="flex flex-col gap-4 md:gap-6">
      {/* The hero spans both columns from md up. Below md an open Schedule is
          the whole screen, so the hero yields with the timeline. */}
      <div className={cn(openItem && 'hidden md:block')}>
        <SchedulesHero model={hero} eventId={eventId} onOpen={select} />
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
        {/* The timeline. Below md it yields the screen to an open pane; at md and
          up it stays in view while a long pane scrolls, and scrolls on its own
          when it is taller than the viewport. */}
        <div
          className={cn(
            'flex min-w-0 flex-col gap-4 md:w-80 md:shrink-0 lg:w-96',
            'md:sticky md:top-4 md:max-h-[calc(100svh-2rem)] md:overflow-y-auto',
            openItem && 'hidden md:flex',
          )}
        >
          <ScheduleTimeline
            items={items}
            activeId={paneItem?.id ?? null}
            onSelect={select}
            dayLabel={dayLabel}
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
  );
}
