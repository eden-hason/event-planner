import type { ReactNode } from 'react';
import { getFormatter, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { rsvpPresentation } from '@/features/guests/utils';
import { getHomeGroups, getHomeGuests, getRecentRsvpActivity } from '../../queries';
import { countHeads, groupHeads, percent } from '../../utils/counts';
import { RsvpTriBar } from './rsvp-tri-bar';
import { CollapsibleRows } from './collapsible-rows';

const GROUP_COLORS = ['bg-primary', 'bg-home-violet', 'bg-chart-2', 'bg-rsvp-pending', 'bg-rsvp-confirmed'];

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
        <div className="flex items-center gap-[18px]">
          <div
            className="flex size-[112px] shrink-0 items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(var(--rsvp-confirmed) 0 ${okP}%, var(--rsvp-pending) ${okP}% ${100 - decP}%, var(--rsvp-declined) ${100 - decP}% 100%)`,
            }}
          >
            <div className="bg-card flex size-[78px] flex-col items-center justify-center rounded-full">
              <span className="text-[22px] leading-none font-extrabold">{okP}%</span>
              <span className="text-muted-foreground text-[11px]">{t('donutCenter')}</span>
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-2">
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
        <div className="flex items-center gap-3.5">
          <div className="border-muted size-[84px] shrink-0 rounded-full border-[10px]" />
          <span className="text-muted-foreground text-[13px] leading-normal">{t('donutEmpty')}</span>
        </div>
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

  return (
    <Panel className="flex flex-col gap-3 p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[15px] font-bold">{t('engagementTitle')}</h2>
        {rows.length > 0 && (
          <span className="text-muted-foreground text-[11px]">{t('engagementLegend')}</span>
        )}
      </div>
      {rows.length > 0 ? (
        <CollapsibleRows className="flex flex-col gap-3" buttonClassName="text-start">
          {rows.map((row) => (
            <div key={row.id} className="flex flex-col gap-1.5">
              <div className="flex justify-between gap-3 text-[13px]">
                <span className="truncate font-semibold">{row.name}</span>
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
        <div className="flex flex-col gap-2">
          <div className="bg-muted h-[7px] rounded-full" />
          <div className="bg-muted h-[7px] w-[70%] rounded-full" />
          <span className="text-muted-foreground text-[13px]">{t('engagementEmpty')}</span>
        </div>
      )}
    </Panel>
  );
}

export async function GroupHeadsCard({ eventId }: { eventId: string }) {
  const [t, groups] = await Promise.all([
    getTranslations('home.mobile.analytics'),
    getHomeGroups(eventId),
  ]);
  const rows = groupHeads(groups);
  const totalHeads = rows.reduce((sum, row) => sum + row.total, 0);

  return (
    <Panel className="overflow-hidden">
      <div className="flex items-baseline justify-between px-4 pt-3.5 pb-2.5">
        <h2 className="text-[15px] font-bold">{t('groupsTitle')}</h2>
        {rows.length > 0 && (
          <span className="text-muted-foreground text-xs">
            {t('groupsSummary', { groups: rows.length, guests: totalHeads })}
          </span>
        )}
      </div>
      {rows.length > 0 ? (
        <CollapsibleRows buttonClassName="border-border w-full border-t px-4 py-[11px]">
          {rows.map((row, i) => (
            <div key={row.id} className="border-border flex items-center gap-2.5 border-t px-4 py-[11px]">
              <span className={cn('size-2 shrink-0 rounded-[2px]', GROUP_COLORS[i % GROUP_COLORS.length])} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{row.name}</span>
              <span className="text-muted-foreground text-[13px]">{t('groupRow', { count: row.total })}</span>
              <span className="w-10 text-end text-[13px] font-bold">{percent(row.confirmed, row.total)}%</span>
            </div>
          ))}
        </CollapsibleRows>
      ) : (
        <p className="text-muted-foreground px-4 pt-1 pb-4 text-[13px]">{t('groupsEmpty')}</p>
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
          <Link href={`/app/${eventId}/guests`} className="text-primary text-xs font-semibold">
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
        <p className="text-muted-foreground px-4 pt-1 pb-4 text-[13px]">{t('activityEmpty')}</p>
      )}
    </Panel>
  );
}
