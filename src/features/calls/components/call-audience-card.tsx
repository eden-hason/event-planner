import { getLocale, getTranslations } from 'next-intl/server';
import { IconUsers } from '@tabler/icons-react';

import { ADMIN_TIME_ZONE } from '@/lib/date-time';
import { SettingsCard } from '@/features/schedules/components/settings-card';

import type { CallPaneState } from '../utils/pane-state';

/**
 * Who the team will phone. Before Start this is a live count that shrinks as
 * guests answer on their own; after Start it is the frozen call list, and the
 * copy says so, because "38 guests" means two different things on either side
 * of that moment.
 */
export async function CallAudienceCard({
  state,
  targetStatus,
  count,
  scheduledDate,
  startedDate,
}: {
  state: Exclude<CallPaneState, 'off'>;
  targetStatus?: 'pending' | 'confirmed' | null;
  count: number;
  /** The plan's date, for "anyone who answers by then drops off the list". */
  scheduledDate: string;
  /** When the round started, for a finished round's "the list as it was on". */
  startedDate: string | null;
}) {
  const t = await getTranslations('calls.audience');
  const locale = await getLocale();
  const dayMonth = new Intl.DateTimeFormat(locale, {
    timeZone: ADMIN_TIME_ZONE,
    day: 'numeric',
    month: 'numeric',
  });

  const started = state === 'live' || state === 'done';
  const label = started
    ? t(state === 'done' ? 'label.done' : 'label.live')
    : t(`label.${targetStatus ?? 'all'}`);

  const detail = started
    ? state === 'done' && startedDate
      ? t('detail.done', { date: dayMonth.format(new Date(startedDate)) })
      : t('detail.live')
    : t('detail.planned');

  const planned = state === 'planned' || state === 'locked';
  const note = planned
    ? targetStatus === 'pending'
      ? t('note.planned', { date: dayMonth.format(new Date(scheduledDate)) })
      : null
    : state === 'live'
      ? t('note.live')
      : null;

  return (
    <SettingsCard title={t('title')}>
      <div className="bg-muted/60 flex items-center gap-3 rounded-xl p-3">
        <span
          aria-hidden
          className="bg-violet-tint text-violet-strong flex size-[38px] shrink-0 items-center justify-center rounded-[10px]"
        >
          <IconUsers size={18} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[14.5px] font-semibold">{label}</span>
          <span className="text-muted-foreground text-xs">{detail}</span>
        </div>
        <span className="text-[22px] font-extrabold tabular-nums">{count}</span>
      </div>
      {note && <p className="text-muted-foreground text-xs leading-relaxed">{note}</p>}
    </SettingsCard>
  );
}
