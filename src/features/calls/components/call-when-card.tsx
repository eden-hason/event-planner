import { getLocale, getTranslations } from 'next-intl/server';
import { IconCalendar } from '@tabler/icons-react';

import { ADMIN_TIME_ZONE } from '@/lib/date-time';
import { SettingsCard } from '@/features/schedules/components/settings-card';

import type { CallPaneState } from '../utils/pane-state';

/**
 * When the team phones, shown the way a message shows its own date and time but
 * with nothing to edit: the plan belongs to the Back Office and the Owner is
 * view-only on it, enforced by a restrictive RLS policy rather than by hiding
 * controls (docs/adr/0004-call-schedules-are-plans-call-rounds-are-executions.md).
 *
 * The field is drawn as a field so a call and a message read as one plan, but
 * it is plain text: an inert input would invite a click that goes nowhere.
 *
 * Only the date: the team phones over the course of that day, so a clock time
 * would promise a precision the round does not have.
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
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-muted-foreground text-xs">{t('date')}</span>
        <div className="bg-muted/60 text-muted-foreground flex h-[46px] items-center gap-2 rounded-[11px] border px-3">
          <IconCalendar size={16} className="shrink-0" />
          <span className="truncate text-[14.5px] font-semibold">{date}</span>
        </div>
      </div>
      <p className="text-muted-foreground text-xs leading-relaxed">
        {t(`note.${state === 'off' ? 'planned' : state}`)}
      </p>
    </SettingsCard>
  );
}
