import type { ReactNode } from 'react';
import { IconBell, IconList, IconMessage, IconUsers } from '@tabler/icons-react';
import { getFormatter, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { rsvpPresentation } from '@/features/guests/utils';
import { getHomeEvent, getHomeGroups, getHomeGuests, getRecentRsvpActivity } from '../queries';
import { countAnswerSources, countHeads, groupHeads, percent } from '../utils/counts';
import { RsvpTriBar } from './rsvp-tri-bar';
import { CollapsibleRows } from './collapsible-rows';

/**
 * One tone per RSVP Source, in the card's fixed order. Deliberately not the
 * RSVP status colours: these say how an answer came in, not what it was.
 */
const SOURCE_TONES = [
  { bar: 'bg-primary', row: 'bg-primary/10 text-primary' },
  { bar: 'bg-home-violet', row: 'bg-home-violet-tint text-home-violet' },
  { bar: 'bg-chart-2', row: 'bg-chart-2/10 text-chart-2' },
] as const;

/**
 * An empty card at wide width: a faded ghost of what the card will hold, with
 * the empty-state line and an icon fading in over its lower half. The ghost
 * is `home-wide:` only - below that the cards keep their plain mobile empties.
 */
function GhostEmpty({
  icon,
  message,
  overlayOffset,
  className,
  children,
}: {
  icon: ReactNode;
  message: string;
  /** Pushes the message down the ghost so it lands over the faded part. */
  overlayOffset: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('relative hidden home-wide:block', className)}>
      {children}
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-transparent to-card to-66% p-4">
        <div className="flex max-w-[300px] flex-col items-center gap-1.5 text-center" style={{ marginTop: overlayOffset }}>
          <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-full">
            {icon}
          </span>
          <span className="text-muted-foreground text-[13px] leading-normal text-pretty">{message}</span>
        </div>
      </div>
    </div>
  );
}

const GHOST_BAR = 'bg-muted rounded-full';

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn('bg-card border-border rounded-2xl border', className)}>{children}</section>
  );
}

export async function RsvpDonutCard({ eventId }: { eventId: string }) {
  const [t, guests] = await Promise.all([
    getTranslations('home.mobile.analytics'),
    getHomeGuests(eventId),
  ]);
  const heads = countHeads(guests);
  const okP = percent(heads.confirmed, heads.total);
  const decP = percent(heads.declined, heads.total);

  const legend = [
    { status: 'confirmed', n: heads.confirmed },
    { status: 'pending', n: heads.pending },
    { status: 'declined', n: heads.declined },
  ] as const;

  return (
    <Panel className="flex flex-col gap-3.5 p-4">
      <h2 className="text-[15px] font-bold">{t('donutTitle')}</h2>
      {heads.total > 0 ? (
        <div className="home-wide:gap-5 flex items-center gap-[18px]">
          <div
            className="home-wide:size-[128px] flex size-[112px] shrink-0 items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(var(--rsvp-confirmed) 0 ${okP}%, var(--rsvp-pending) ${okP}% ${100 - decP}%, var(--rsvp-declined) ${100 - decP}% 100%)`,
            }}
          >
            <div className="bg-card home-wide:size-[90px] flex size-[78px] flex-col items-center justify-center rounded-full">
              <span className="home-wide:text-2xl text-[22px] leading-none font-extrabold">{okP}%</span>
              <span className="text-muted-foreground text-[11px]">{t('donutCenter')}</span>
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {legend.map(({ status, n }) => (
              <div
                key={status}
                className={cn(
                  'flex items-center justify-between rounded-[9px] px-2.5 py-[7px]',
                  rsvpPresentation(status).chip,
                )}
              >
                <span className="flex items-center gap-[7px] text-[13px] font-semibold">
                  <span className={cn('size-2 rounded-full', rsvpPresentation(status).solid)} />
                  {t(status)}
                </span>
                <span className="text-sm font-bold">{n}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="home-wide:hidden flex items-center gap-3.5">
            <div className="border-muted size-[84px] shrink-0 rounded-full border-[10px]" />
            <span className="text-muted-foreground text-[13px] leading-normal">{t('donutEmpty')}</span>
          </div>
          <GhostEmpty
            icon={<IconUsers className="size-[18px]" strokeWidth={1.9} />}
            message={t('donutEmpty')}
            overlayOffset="64px"
          >
            <div className="flex items-center gap-5">
              <div
                className="flex size-[128px] shrink-0 items-center justify-center rounded-full"
                style={{
                  background:
                    'conic-gradient(var(--rsvp-confirmed-tint) 0 58%, var(--rsvp-pending-tint) 58% 86%, var(--rsvp-declined-tint) 86% 100%)',
                }}
              >
                <div className="bg-card flex size-[90px] flex-col items-center justify-center gap-1.5 rounded-full">
                  <span className={cn(GHOST_BAR, 'h-3.5 w-9')} />
                  <span className={cn(GHOST_BAR, 'h-[7px] w-[26px]')} />
                </div>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                {[
                  ['bg-rsvp-confirmed-tint', 'bg-rsvp-confirmed/40', 'w-[46%]', 'opacity-100'],
                  ['bg-rsvp-pending-tint', 'bg-rsvp-pending/40', 'w-[38%]', 'opacity-70'],
                  ['bg-rsvp-declined-tint', 'bg-rsvp-declined/40', 'w-[30%]', 'opacity-45'],
                ].map(([tint, bar, width, opacity]) => (
                  <div
                    key={tint}
                    className={cn('flex h-[34px] items-center justify-between rounded-[9px] px-2.5', tint, opacity)}
                  >
                    <span className={cn('h-2 rounded-full', bar, width)} />
                    <span className={cn('h-2 w-5 rounded-full', bar)} />
                  </div>
                ))}
              </div>
            </div>
          </GhostEmpty>
        </>
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
        <>
          <div className="home-wide:hidden flex flex-col gap-2">
            <div className="bg-muted h-[7px] rounded-full" />
            <div className="bg-muted h-[7px] w-[70%] rounded-full" />
            <span className="text-muted-foreground text-[13px]">{t('engagementEmpty')}</span>
          </div>
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
        </>
      )}
    </Panel>
  );
}

/**
 * How answered RSVPs came in, by RSVP Source: the Guest themselves, a Call
 * Round, or an edit in the guest list. Counts answers (Guest Records), so it
 * never reads as contradicting the head counts beside it.
 */
export async function AnswerSourcesCard({ eventId }: { eventId: string }) {
  const [t, event, guests] = await Promise.all([
    getTranslations('home.mobile.analytics'),
    getHomeEvent(eventId),
    getHomeGuests(eventId),
  ]);
  const counts = countAnswerSources(guests);
  // Two Call Rounds come with every paid Event, so a 0 there means "coming", not "not done".
  const callsComing = event?.billingStatus === 'paid';

  const sources = [
    { label: t('sourcesGuest'), n: counts.guest },
    { label: t('sourcesCall'), n: counts.call, hint: callsComing ? t('sourcesCallsHint') : null },
    { label: t('sourcesList'), n: counts.list },
  ].map((source, i) => ({ ...source, tone: SOURCE_TONES[i] }));

  return (
    <Panel className="flex flex-col gap-3 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-bold">{t('sourcesTitle')}</h2>
        {counts.total > 0 && (
          <span className="flex shrink-0 items-baseline gap-[5px]">
            <span className="text-xl leading-none font-extrabold tabular-nums">{counts.total}</span>
            <span className="text-muted-foreground text-xs">{t('sourcesUnit')}</span>
          </span>
        )}
      </div>
      {counts.total > 0 ? (
        <>
          <div className="bg-muted flex h-2.5 gap-0.5 overflow-hidden rounded-full">
            {sources
              .filter((source) => source.n > 0)
              .map((source) => (
                <div
                  key={source.label}
                  className={source.tone.bar}
                  style={{ width: `${percent(source.n, counts.total)}%` }}
                />
              ))}
          </div>
          <div className="flex flex-col gap-2">
            {sources.map((source) => {
              const zero = source.n === 0;
              const hint = zero ? source.hint : null;
              return (
                <div
                  key={source.label}
                  className={cn(
                    'flex min-h-9 items-center justify-between gap-3 rounded-[9px] px-2.5 py-[7px]',
                    zero ? 'bg-muted text-muted-foreground' : source.tone.row,
                  )}
                >
                  <span className="flex min-w-0 items-center gap-[7px]">
                    <span
                      className={cn('size-2 shrink-0 rounded-full', zero ? 'bg-border' : source.tone.bar)}
                    />
                    <span className="flex min-w-0 flex-col">
                      <span className="text-[13px] font-semibold">{source.label}</span>
                      {hint && (
                        <span className="text-muted-foreground text-[11.5px] leading-[1.4] font-medium">
                          {hint}
                        </span>
                      )}
                    </span>
                  </span>
                  {!hint && (
                    <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
                      <span className="text-sm font-bold">{source.n}</span>
                      <span className="w-[34px] text-end text-xs font-semibold opacity-85">
                        {percent(source.n, counts.total)}%
                      </span>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="home-wide:hidden flex flex-col gap-2.5">
            <div className="bg-muted h-2.5 rounded-full" />
            <span className="text-muted-foreground text-[13px] leading-normal">{t('sourcesEmpty')}</span>
          </div>
          <GhostEmpty
            icon={<IconMessage className="size-[18px]" strokeWidth={1.9} />}
            message={t('sourcesEmpty')}
            overlayOffset="56px"
          >
            <div className="flex flex-col gap-3">
              <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
                <div className="bg-primary/10 w-[58%]" />
                <div className="bg-home-violet-tint w-[27%]" />
                <div className="bg-chart-2/10 w-[15%]" />
              </div>
              <div className="flex flex-col gap-2">
                {[
                  ['bg-primary/10', 'w-[34%]', 'opacity-100'],
                  ['bg-home-violet-tint', 'w-[46%]', 'opacity-70'],
                  ['bg-chart-2/10', 'w-[40%]', 'opacity-45'],
                ].map(([tint, width, opacity]) => (
                  <div
                    key={tint}
                    className={cn('flex h-9 items-center justify-between rounded-[9px] px-2.5', tint, opacity)}
                  >
                    <span className={cn(GHOST_BAR, 'h-2', width)} />
                    <span className={cn(GHOST_BAR, 'h-2 w-11')} />
                  </div>
                ))}
              </div>
            </div>
          </GhostEmpty>
        </>
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
        <>
          <p className="text-muted-foreground home-wide:hidden px-4 pt-1 pb-4 text-[13px]">
            {t('activityEmpty')}
          </p>
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
        </>
      )}
    </Panel>
  );
}
