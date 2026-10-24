import type { ReactNode } from 'react';
import { IconBell, IconList, IconUsers } from '@tabler/icons-react';
import { getFormatter, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { GHOST_BAR, GhostEmpty } from '@/components/ghost-empty';
import { rsvpPresentation } from '@/features/guests/utils';
import { getHomeGroups, getHomeGuests, getRecentRsvpActivity } from '../queries';
import { countHeads, groupHeads, percent } from '../utils/counts';
import { ringSegments, type RingSegment } from '../utils/ring';
import { RsvpTriBar } from './rsvp-tri-bar';
import { CollapsibleRows } from './collapsible-rows';

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn('bg-card border-border rounded-2xl border', className)}>{children}</section>
  );
}

const RSVP_STROKES = {
  confirmed: { solid: 'stroke-rsvp-confirmed', tint: 'stroke-rsvp-confirmed-tint' },
  pending: { solid: 'stroke-rsvp-pending', tint: 'stroke-rsvp-pending-tint' },
  declined: { solid: 'stroke-rsvp-declined', tint: 'stroke-rsvp-declined-tint' },
} as const;

/** A thin segmented ring, drawn clockwise from the top, with `children` in its middle. */
function Ring({
  segments,
  tone,
  children,
}: {
  segments: RingSegment<keyof typeof RSVP_STROKES>[];
  tone: 'solid' | 'tint';
  children: ReactNode;
}) {
  return (
    <div className="relative size-[116px] shrink-0">
      <svg viewBox="0 0 116 116" className="size-full -rotate-90" aria-hidden="true">
        {segments.map((segment) => (
          <circle
            key={segment.key}
            cx="58"
            cy="58"
            r="50"
            fill="none"
            strokeWidth="9"
            pathLength="100"
            strokeDasharray={`${segment.length} ${100 - segment.length}`}
            strokeDashoffset={-segment.start}
            className={RSVP_STROKES[segment.key][tone]}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

export async function RsvpDonutCard({ eventId }: { eventId: string }) {
  const [t, guests] = await Promise.all([
    getTranslations('home.mobile.analytics'),
    getHomeGuests(eventId),
  ]);
  const heads = countHeads(guests);

  const legend = (['confirmed', 'pending', 'declined'] as const).map((status) => ({
    key: status,
    n: heads[status],
  }));

  return (
    <Panel className="flex flex-col gap-3.5 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-bold">{t('donutTitle')}</h2>
        {heads.total > 0 && (
          <span className="text-muted-foreground shrink-0 text-xs">
            {t('donutTotal', { count: heads.total })}
          </span>
        )}
      </div>
      {heads.total > 0 ? (
        <div className="flex items-center gap-5">
          <Ring segments={ringSegments(legend)} tone="solid">
            <span dir="ltr" className="text-[28px] leading-none font-extrabold tracking-[-0.03em]">
              {percent(heads.confirmed, heads.total)}%
            </span>
            <span className="text-muted-foreground mt-0.5 text-xs">{t('donutCenter')}</span>
          </Ring>
          <div className="divide-border flex min-w-0 flex-1 flex-col divide-y">
            {legend.map(({ key, n }) => (
              <div key={key} className="flex items-center gap-2 py-[9px]">
                <span className={cn('size-2 shrink-0 rounded-full', rsvpPresentation(key).solid)} />
                <span className="text-muted-foreground min-w-0 flex-1 truncate text-sm">{t(key)}</span>
                <span className="text-[15px] font-bold tabular-nums">{n}</span>
                <span className="text-muted-foreground w-[34px] text-end text-xs tabular-nums">
                  {percent(n, heads.total)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <GhostEmpty
          icon={<IconUsers className="size-[18px]" strokeWidth={1.9} />}
          message={t('donutEmpty')}
          overlayOffset="64px"
        >
          <div className="flex items-center gap-5">
            <Ring
              segments={ringSegments([
                { key: 'confirmed', n: 58 },
                { key: 'pending', n: 28 },
                { key: 'declined', n: 14 },
              ])}
              tone="tint"
            >
              <span className={cn(GHOST_BAR, 'h-4 w-10')} />
              <span className={cn(GHOST_BAR, 'mt-1.5 h-[7px] w-[26px]')} />
            </Ring>
            <div className="divide-border flex min-w-0 flex-1 flex-col divide-y">
              {[
                ['bg-rsvp-confirmed-tint', 'w-[46%]', 'opacity-100'],
                ['bg-rsvp-pending-tint', 'w-[38%]', 'opacity-70'],
                ['bg-rsvp-declined-tint', 'w-[30%]', 'opacity-45'],
              ].map(([dot, width, opacity]) => (
                <div key={dot} className={cn('flex h-[38px] items-center gap-2', opacity)}>
                  <span className={cn('size-2 shrink-0 rounded-full', dot)} />
                  <span className={cn(GHOST_BAR, 'h-2', width)} />
                  <span className={cn(GHOST_BAR, 'ms-auto h-2 w-6')} />
                </div>
              ))}
            </div>
          </div>
        </GhostEmpty>
      )}
    </Panel>
  );
}

export async function GroupEngagementCard({ eventId }: { eventId: string }) {
  const [t, groups] = await Promise.all([
    getTranslations('home.mobile.analytics'),
    getHomeGroups(eventId),
  ]);
  const rows = groupHeads(groups);
  const totalHeads = rows.reduce((sum, row) => sum + row.total, 0);

  return (
    <Panel className="flex flex-col gap-3 p-4">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[15px] font-bold">{t('engagementTitle')}</h2>
          {rows.length > 0 && (
            <span className="text-muted-foreground shrink-0 text-xs">
              {t('groupsSummary', { groups: rows.length, guests: totalHeads })}
            </span>
          )}
        </div>
        {rows.length > 0 && (
          <span className="text-muted-foreground text-[11px]">{t('engagementLegend')}</span>
        )}
      </div>
      {rows.length > 0 ? (
        <CollapsibleRows
          className="flex flex-col gap-3"
          buttonClassName="self-start text-start underline-offset-[3px] hover:underline focus-visible:underline outline-none"
        >
          {rows.map((row) => (
            <div key={row.id} className="flex flex-col gap-1.5">
              <div className="flex justify-between gap-3 text-[13px]">
                <span className="min-w-0 truncate font-semibold">{row.name}</span>
                <span className="text-muted-foreground shrink-0">
                  {t.rich('engagementRow', {
                    confirmed: row.confirmed,
                    total: row.total,
                    b: (chunks) => <b className="text-rsvp-confirmed-strong">{chunks}</b>,
                  })}
                </span>
              </div>
              <RsvpTriBar counts={row} className="h-[7px]" />
            </div>
          ))}
        </CollapsibleRows>
      ) : (
        <GhostEmpty
          icon={<IconList className="size-[18px]" strokeWidth={1.9} />}
          message={t('engagementEmpty')}
          overlayOffset="44px"
          className="pb-6"
        >
          <div className="flex flex-col gap-3.5">
            {[
              ['w-[30%]', 'w-[60%]', 'w-[22%]', 'opacity-100'],
              ['w-[24%]', 'w-[48%]', 'w-[30%]', 'opacity-75'],
              ['w-[36%]', 'w-[40%]', 'w-[34%]', 'opacity-50'],
              ['w-[20%]', 'w-[30%]', 'w-[40%]', 'opacity-30'],
            ].map(([name, ok, pending, opacity]) => (
              <div key={name + ok} className={cn('flex flex-col gap-[7px]', opacity)}>
                <div className="flex justify-between">
                  <span className={cn(GHOST_BAR, 'h-[9px]', name)} />
                  <span className={cn(GHOST_BAR, 'h-[9px] w-12')} />
                </div>
                <div className="flex h-[7px] gap-0.5 overflow-hidden rounded-full">
                  <div className={cn('bg-rsvp-confirmed-tint', ok)} />
                  <div className={cn('bg-rsvp-pending-tint', pending)} />
                  <div className="bg-rsvp-declined-tint flex-1" />
                </div>
              </div>
            ))}
          </div>
        </GhostEmpty>
      )}
    </Panel>
  );
}

export async function RecentActivityCard({ eventId }: { eventId: string }) {
  const [t, tActivity, format, activity] = await Promise.all([
    getTranslations('home.mobile.analytics'),
    getTranslations('home.recentActivity'),
    getFormatter(),
    getRecentRsvpActivity(eventId, 4),
  ]);
  const now = new Date();

  return (
    <Panel className="overflow-hidden">
      <div className="flex items-baseline justify-between px-4 pt-3.5 pb-2.5">
        <h2 className="text-[15px] font-bold">{t('activityTitle')}</h2>
        {activity.length > 0 && (
          <Link
            href={`/app/${eventId}/guests`}
            className="text-primary text-xs font-semibold underline-offset-[3px] outline-none hover:underline focus-visible:underline"
          >
            {t('activityViewAll')}
          </Link>
        )}
      </div>
      {activity.length > 0 ? (
        activity.map((row) => {
          const presentation = rsvpPresentation(row.rsvpStatus);
          const action =
            row.rsvpStatus === 'confirmed'
              ? tActivity('confirmedAttendance')
              : row.rsvpStatus === 'declined'
                ? tActivity('declinedInvitation')
                : tActivity('updatedRsvp');
          return (
            <div key={row.id} className="border-border flex items-center gap-3 border-t px-4 py-[11px]">
              <span
                className={cn(
                  'flex size-[34px] shrink-0 items-center justify-center rounded-full text-[13px] font-bold',
                  presentation.chip,
                )}
              >
                {row.name.trim().charAt(0)}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-px">
                <span className="truncate text-sm font-semibold">{row.name}</span>
                <span className={cn('text-[12.5px]', presentation.text)}>
                  {row.rsvpChangeSource === 'admin_call' ? `${action} · ${tActivity('byPhone')}` : action}
                </span>
              </div>
              <span className="text-muted-foreground text-[11.5px] whitespace-nowrap">
                {format.relativeTime(new Date(row.rsvpChangedAt), now)}
              </span>
            </div>
          );
        })
      ) : (
        <GhostEmpty
          icon={<IconBell className="size-[18px]" strokeWidth={1.9} />}
          message={t('activityEmpty')}
          overlayOffset="44px"
        >
          {[
            ['bg-rsvp-confirmed-tint', 'w-[46%]', 'w-[30%]', 'opacity-100'],
            ['bg-rsvp-declined-tint', 'w-[38%]', 'w-[24%]', 'opacity-70'],
            ['bg-rsvp-pending-tint', 'w-[52%]', 'w-[34%]', 'opacity-45'],
          ].map(([tint, w1, w2, opacity]) => (
            <div
              key={tint}
              className={cn('border-border flex items-center gap-3 border-t px-4 py-[11px]', opacity)}
            >
              <span className={cn('size-[34px] shrink-0 rounded-full', tint)} />
              <div className="flex flex-1 flex-col gap-[7px]">
                <span className={cn(GHOST_BAR, 'h-[9px]', w1)} />
                <span className={cn('h-[7px] rounded-full', tint, w2)} />
              </div>
              <span className={cn(GHOST_BAR, 'h-[7px] w-11')} />
            </div>
          ))}
        </GhostEmpty>
      )}
    </Panel>
  );
}
