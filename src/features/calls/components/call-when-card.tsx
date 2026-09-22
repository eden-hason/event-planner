import { getLocale, getTranslations } from 'next-intl/server';
import { IconCalendar } from '@tabler/icons-react';

import { ADMIN_TIME_ZONE, israelWallClockParts } from '@/lib/date-time';
import { SettingsCard } from '@/features/schedules/components/settings-card';

import type { CallPaneState } from '../utils/pane-state';

/**
 * When the team phones, shown the way a message shows its own date and time but
 * with nothing to edit: the plan belongs to the Back Office and the Owner is
 * view-only on it, enforced by a restrictive RLS policy rather than by hiding
 * controls (docs/adr/0004-call-schedules-are-plans-call-rounds-are-executions.md).
 *
 * The fields are drawn as fields so a call and a message read as one plan, but
 * they are plain text: an inert input would invite a click that goes nowhere.
 */
export async function CallWhenCard({
  scheduledDate,
  state,
}: {
  scheduledDate: string;
  state: CallPaneState;
}) {
  const t = await getTranslations('calls.when');
  // Server-rendered, so the locale has to be passed explicitly: a bare
  // toLocaleDateString() would format in the server's locale.
  const locale = await getLocale();

  const date = new Intl.DateTimeFormat(locale, {
    timeZone: ADMIN_TIME_ZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(scheduledDate));
  const time = israelWallClockParts(scheduledDate).time;

  const badge = state === 'live' ? t('badge.live') : state === 'done' ? t('badge.done') : null;

  return (
    <SettingsCard
      title={t('title')}
      aside={
        badge ? (
          <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[11.5px] font-bold">
            {badge}
          </span>
        ) : undefined
      }
    >
      {/* Stacks when the card is too narrow for the pair - see ScheduleDetailsCard. */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(10.5rem,1fr))] gap-2">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-muted-foreground text-xs">{t('date')}</span>
          <div className="bg-muted/60 text-muted-foreground flex h-[46px] items-center gap-2 rounded-[11px] border px-3">
            <IconCalendar size={16} className="shrink-0" />
            <span className="truncate text-[14.5px] font-semibold">{date}</span>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-muted-foreground text-xs">{t('time')}</span>
          <div className="bg-muted/60 text-muted-foreground flex h-[46px] items-center rounded-[11px] border px-3">
            <span dir="ltr" className="text-[14.5px] font-semibold">
              {time}
            </span>
          </div>
        </div>
      </div>
      <p className="text-muted-foreground text-xs leading-relaxed">
        {t(`note.${state === 'off' ? 'planned' : state}`)}
      </p>
    </SettingsCard>
  );
}
