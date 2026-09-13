import type { ReactNode } from 'react';
import { getLocale, getTranslations } from 'next-intl/server';
import { IconChevronRight, IconCoin, IconArmchair, IconSend } from '@tabler/icons-react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { getHomeEvent, getHomeViewer, getStatusStrip } from '../../queries';

function StripRow({
  href,
  icon,
  label,
  value,
  started,
  bar,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  value: string;
  started: boolean;
  bar?: { pct: number; tone: 'primary' | 'ok' | 'over' } | null;
}) {
  return (
    <Link
      href={href}
      className="border-border flex w-full items-center gap-3 border-t px-3.5 py-[13px] first:border-t-0"
    >
      <span
        className={cn(
          'flex size-[38px] shrink-0 items-center justify-center rounded-[10px]',
          started ? 'bg-muted text-muted-foreground' : 'bg-primary/15 text-primary',
        )}
      >
        {icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-muted-foreground text-xs">{label}</span>
        <span className={cn('text-sm', started ? 'font-semibold' : 'text-primary font-bold')}>
          {value}
        </span>
        {bar && (
          <div className="bg-muted mt-1 h-[5px] w-full overflow-hidden rounded-full">
            <div
              className={cn(
                'h-full rounded-full',
                bar.tone === 'over' ? 'bg-rsvp-declined' : bar.tone === 'ok' ? 'bg-rsvp-confirmed' : 'bg-primary',
              )}
              style={{ width: `${bar.pct}%` }}
            />
          </div>
        )}
      </div>
      <IconChevronRight className="text-muted-foreground size-[18px] shrink-0 rtl:rotate-180" />
    </Link>
  );
}

/** Budget, seating and messages - one line each, each linking into its feature. */
export async function StatusStripSection({ eventId }: { eventId: string }) {
  const [t, locale, event, viewer] = await Promise.all([
    getTranslations('home.mobile.strip'),
    getLocale(),
    getHomeEvent(eventId),
    getHomeViewer(eventId),
  ]);
  if (!event || !viewer?.isOwner) return null;

  const strip = await getStatusStrip(event);
  const currency = new Intl.NumberFormat(locale === 'he' ? 'he-IL' : 'en-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  });
  const base = `/app/${eventId}`;

  const budget = strip.budget;
  const budgetValue = !budget
    ? t('budgetEmpty')
    : budget.total !== null
      ? t('budgetOf', { spent: currency.format(budget.spent), total: currency.format(budget.total) })
      : t('budgetSpent', { spent: currency.format(budget.spent) });
  const budgetPct = budget?.total ? Math.min(100, (budget.spent / budget.total) * 100) : null;

  const seating = strip.seating;
  const seatingPct = seating && seating.total > 0 ? (seating.seated / seating.total) * 100 : 0;

  const schedule = strip.schedule;
  const scheduleValue = !schedule
    ? t('scheduleEmpty')
    : schedule.kind === 'allSent'
      ? t('scheduleAllSent')
      : schedule.kind === 'pending'
        ? t('scheduleQueued', { count: schedule.count })
        : t('scheduleNext', {
            type: t.has(`scheduleTypes.${schedule.typeKey}`)
              ? t(`scheduleTypes.${schedule.typeKey}`)
              : schedule.typeKey,
            days: schedule.days,
          });

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="px-0.5 text-[17px] font-bold">{t('title')}</h2>
      <div className="bg-card border-border overflow-hidden rounded-2xl border">
        <StripRow
          href={`${base}/budget`}
          icon={<IconCoin className="size-[19px]" strokeWidth={1.9} />}
          label={t('budget')}
          value={budgetValue}
          started={Boolean(budget)}
          bar={
            budgetPct !== null && budget
              ? { pct: budgetPct, tone: budget.spent > (budget.total ?? 0) ? 'over' : budgetPct >= 100 ? 'ok' : 'primary' }
              : null
          }
        />
        <StripRow
          href={`${base}/seating`}
          icon={<IconArmchair className="size-[19px]" strokeWidth={1.9} />}
          label={t('seating')}
          value={seating ? t('seatingValue', seating) : t('seatingEmpty')}
          started={Boolean(seating)}
          bar={seating ? { pct: seatingPct, tone: seatingPct >= 100 ? 'ok' : 'primary' } : null}
        />
        <StripRow
          href={`${base}/schedules`}
          icon={<IconSend className="size-[19px]" strokeWidth={1.9} />}
          label={t('messages')}
          value={scheduleValue}
          started={Boolean(schedule)}
        />
      </div>
    </section>
  );
}
