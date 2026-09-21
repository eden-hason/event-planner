import { getLocale, getTranslations } from 'next-intl/server';

import { ADMIN_TIME_ZONE } from '@/lib/date-time';
import { cn } from '@/lib/utils';
import { RefreshButton } from '@/components/refresh-button';

import type { CallRoundResults, CallRoundSummary } from '../types';
import { roundProgress } from '../utils/round-results';
import { CallProgressBar } from './call-progress-bar';

type Tile = {
  key: 'confirmed' | 'declined' | 'noAnswer' | 'willUpdate';
  records: number;
  people: number;
  className: string;
  dot: string;
};

/**
 * What the round has produced so far: the headcount it has confirmed, how far
 * it has got, and how each call ended.
 *
 * Leads with people rather than records. One record can be a whole family, and
 * "8 confirmed" can mean twenty people through the door - the number the Owner
 * plans seating and catering with - so the record count is the supporting line,
 * not the headline.
 *
 * Lays the headline beside the progress bar only from `2xl`: the pane shares
 * the screen with the timeline, so a wide viewport is not a wide pane.
 */
export async function CallRoundResultsCard({
  round,
  results,
}: {
  round: CallRoundSummary;
  results: CallRoundResults;
}) {
  const t = await getTranslations('calls');
  const locale = await getLocale();
  const { summary, people } = results;
  const progress = roundProgress(summary);
  const done = round.status === 'completed';

  const tiles: Tile[] = [
    {
      key: 'confirmed',
      records: summary.confirmed,
      people: people.confirmed,
      className: 'bg-rsvp-confirmed-tint text-rsvp-confirmed-strong',
      dot: 'bg-rsvp-confirmed',
    },
    {
      key: 'declined',
      records: summary.declined,
      people: people.declined,
      className: 'bg-rsvp-declined-tint text-rsvp-declined-strong',
      dot: 'bg-rsvp-declined',
    },
    {
      key: 'noAnswer',
      records: summary.noAnswer,
      people: people.noAnswer,
      className: 'bg-muted text-muted-foreground',
      dot: 'bg-muted-foreground/60',
    },
  ];
  // The fourth outcome only earns a tile once a call ended that way; three
  // tiles share a row on a phone, four would have to wrap.
  if (summary.willUpdate > 0) {
    tiles.push({
      key: 'willUpdate',
      records: summary.willUpdate,
      people: people.willUpdate,
      className: 'bg-outcome-will-update-tint text-outcome-will-update-strong',
      dot: 'bg-outcome-will-update',
    });
  }

  const time = results.lastUpdatedAt
    ? new Intl.DateTimeFormat(locale, {
        timeZone: ADMIN_TIME_ZONE,
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).format(new Date(results.lastUpdatedAt))
    : null;
  // No live push: this is the time of the newest outcome on the page, not a
  // promise that nothing has happened since. A live round re-renders every 30
  // seconds (the pane's AutoRefresh), and the Refresh button is there between.
  const updatedNote = done
    ? t('results.final')
    : time
      ? t('results.updatedAt', { time })
      : t('results.noResultsYet');

  const peopleHint = (n: number) => t('results.peopleHint', { count: n });
  const families = people.confirmed > summary.confirmed;

  return (
    <section className="bg-card flex flex-col gap-3.5 rounded-2xl border p-4 2xl:p-5">
      <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-end 2xl:gap-7">
        <div className="flex items-start justify-between gap-2.5 2xl:block">
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground text-[13px] font-semibold">
              {t('results.leadLabel')}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-[38px] leading-none font-extrabold tabular-nums 2xl:text-[46px]">
                {people.confirmed}
              </span>
              <span className="text-muted-foreground text-sm font-semibold">
                {t('results.peopleUnit')}
              </span>
            </div>
            <span className="text-muted-foreground text-xs">
              {t(families ? 'results.recordsFamilies' : 'results.records', {
                count: summary.confirmed,
              })}
            </span>
          </div>
          <div className="2xl:hidden">
            <RefreshButton label={t('refresh')} withLabel />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2 2xl:pb-1">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-[12.5px] font-semibold 2xl:text-[13px]">
              {t(done ? 'results.progressDone' : 'results.progressLive')}
            </span>
            <span className="text-[12.5px] font-bold tabular-nums 2xl:text-[13px]">
              {t('results.progressValue', { handled: progress.handled, total: progress.total })}
            </span>
          </div>
          <CallProgressBar counts={summary} size="md" />
        </div>

        <div className="hidden 2xl:block 2xl:pb-0.5">
          <RefreshButton label={t('refresh')} withLabel />
        </div>
      </div>

      <div
        className={cn(
          'grid gap-2 2xl:gap-2.5',
          tiles.length > 3 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3',
        )}
      >
        {tiles.map((tile) => (
          <div
            key={tile.key}
            className={cn('flex flex-col gap-0.5 rounded-xl px-3 py-2.5 2xl:px-3.5 2xl:py-3', tile.className)}
          >
            <div className="flex items-center gap-1.5">
              <span aria-hidden className={cn('size-2 rounded-full', tile.dot)} />
              <span className="text-xl leading-none font-extrabold tabular-nums 2xl:text-2xl">
                {tile.records}
              </span>
            </div>
            <span className="text-xs font-semibold 2xl:text-[13px]">{t(`outcome.${tile.key}`)}</span>
            <span className="text-[11px] 2xl:text-[11.5px]">{peopleHint(tile.people)}</span>
          </div>
        ))}
      </div>

      <span className="text-muted-foreground/80 text-[11.5px]">{updatedNote}</span>
    </section>
  );
}
