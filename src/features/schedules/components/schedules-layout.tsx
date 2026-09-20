'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { IconChevronRight, IconPhone } from '@tabler/icons-react';

import { usePathname, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { ADMIN_TIME_ZONE } from '@/lib/date-time';
import { Separator } from '@/components/ui/separator';
import { EventBillingStatusPill } from '@/features/billing';
import { useFeatureLayoutContext } from '@/components/feature-layout';

import type { OutreachItem } from '../types';
import { ScheduleStatusChip } from './schedule-status-chip';
import { ScheduleTimeline } from './schedule-timeline';
import { SchedulesUpsellBanner } from './schedules-upsell-banner';

/** The query parameter that addresses the open Schedule. */
const PARAM = 'schedule';

interface SchedulesLayoutProps {
  items: OutreachItem[];
  /** Whether this Event's whole plan is seeded but not yet enabled. */
  locked: boolean;
  /** Whether the Event type's set includes call rounds at all. */
  hasCalls: boolean;
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
  locked,
  hasCalls,
  eventDate,
}: SchedulesLayoutProps) {
  const t = useTranslations('schedules');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setHeader, clearHeader } = useFeatureLayoutContext();

  const openId = searchParams.get(PARAM);
  // An id that no longer resolves (a stale link, a deleted Schedule) falls back
  // to the timeline rather than to a blank pane.
  const openItem = items.find((item) => item.id === openId) ?? null;
  // The wide layout always has something in the pane; the narrow one shows the
  // pane only when the organiser opened it.
  const paneItem = openItem ?? items[0] ?? null;

  const summary = useMemo(() => {
    if (locked) {
      return t('header.lockedSummary', { count: items.length });
    }
    const sent = items.filter((item) => item.status === 'sent').length;
    const pending = items.filter((item) => item.status === 'pending').length;
    return t('header.summary', { sent, pending });
  }, [items, locked, t]);

  useEffect(() => {
    setHeader({
      title: t('header.title'),
      subtitle: summary,
      // The app header only shows the billing pill at `md` and up, so below
      // that this page carries its own - the locked timeline is exactly where
      // the plan matters most.
      action: (
        <span className="md:hidden">
          <EventBillingStatusPill />
        </span>
      ),
    });
    return () => clearHeader();
  }, [setHeader, clearHeader, t, summary]);

  const select = useCallback(
    (id: string) => {
      const next = new URLSearchParams(searchParams);
      next.set(PARAM, id);
      router.push(`${pathname}?${next}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const close = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete(PARAM);
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

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
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
      {/* The timeline. Below md it yields the screen to an open pane. */}
      <div
        className={cn(
          'flex min-w-0 flex-col gap-4 md:w-80 md:shrink-0 lg:w-96',
          openItem && 'hidden md:flex',
        )}
      >
        {locked && <SchedulesUpsellBanner />}

        <ScheduleTimeline
          items={items}
          activeId={paneItem?.id ?? null}
          onSelect={select}
          dayLabel={dayLabel}
        />

        {hasCalls && (
          <p className="bg-muted/60 text-muted-foreground flex items-start gap-2.5 rounded-xl border p-3 text-xs leading-relaxed">
            <IconPhone className="text-primary mt-0.5 size-4 shrink-0" />
            {t('timeline.callsNote')}
          </p>
        )}
      </div>

      <Separator
        orientation="vertical"
        className="hidden h-auto self-stretch md:block"
      />

      {/* The open Schedule. Below md this is the whole screen. */}
      <div className={cn('min-w-0 flex-1', !openItem && 'hidden md:block')}>
        {paneItem && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={close}
                aria-label={t('detail.back')}
                className="bg-muted text-foreground hover:bg-accent flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors md:hidden"
              >
                <IconChevronRight className="size-5 rtl:rotate-0 ltr:rotate-180" />
              </button>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[17px] font-bold">
                  {paneItem.label}
                </span>
                <span className="text-muted-foreground truncate text-xs">
                  {t(
                    paneItem.kind === 'call' ? 'kind.call' : 'kind.message',
                  )}{' '}
                  · {paneItem.whenDetailed}
                </span>
              </div>
              <ScheduleStatusChip status={paneItem.status} />
            </div>

            {paneItem.details}
          </div>
        )}
      </div>
    </div>
  );
}
