import { getTranslations } from 'next-intl/server';
import { IconUsers, IconUserCheck } from '@tabler/icons-react';

import { SettingsCard } from './settings-card';

interface TargetAudienceCardProps {
  targetStatus?: 'pending' | 'confirmed' | null;
  disabled?: boolean;
  /** The message has gone out, so `count` is who it went to, not who matches now. */
  sent?: boolean;
  /**
   * Before the send, how many guest records that audience holds right now. A
   * targeted audience is re-evaluated on the day of the send, so this is what
   * it would be if the message went out today. After the send, how many guest
   * records the message actually went to.
   */
  count?: number | null;
}

export async function TargetAudienceCard({
  targetStatus,
  disabled,
  sent,
  count,
}: TargetAudienceCardProps) {
  const t = await getTranslations('schedules.audience');

  const audienceLabel =
    targetStatus === 'confirmed'
      ? t('confirmedGuests')
      : targetStatus === 'pending'
        ? t('pendingGuests')
        : t('allGuests');

  const AudienceIcon = targetStatus === 'confirmed' ? IconUserCheck : IconUsers;
  const note = sent
    ? t('sentTo', { target: targetStatus ?? 'all' })
    : targetStatus
      ? t('recomputedNote')
      : null;

  return (
    <SettingsCard title={t('cardTitle')}>
      {disabled ? (
        <p className="text-muted-foreground text-xs">{t('disabledNote')}</p>
      ) : (
        <div className="bg-muted/60 flex items-center gap-3 rounded-xl p-3">
          <span
            aria-hidden
            className="bg-violet-tint text-violet-strong flex size-[38px] shrink-0 items-center justify-center rounded-[10px]"
          >
            <AudienceIcon size={18} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[14.5px] font-semibold">{audienceLabel}</span>
            {note && <span className="text-muted-foreground text-xs">{note}</span>}
          </div>
          {count != null && (
            <span className="text-xl font-extrabold tabular-nums">{count}</span>
          )}
        </div>
      )}
    </SettingsCard>
  );
}
