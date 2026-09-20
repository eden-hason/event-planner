import { getTranslations } from 'next-intl/server';
import { IconX } from '@tabler/icons-react';

import { Link } from '@/i18n/navigation';
import { SettingsCard } from '@/features/schedules/components/settings-card';

/**
 * What the Owner can still do to make the round land: the one thing that turns
 * a guest into a call the team cannot make is a missing phone number, and the
 * Owner is the only one who can supply it.
 *
 * Renders nothing when there is nothing to check, so a clean list is not made
 * to look like homework.
 */
export async function CallChecklistCard({
  eventId,
  withoutPhone,
}: {
  eventId: string;
  withoutPhone: number;
}) {
  if (withoutPhone === 0) return null;

  const t = await getTranslations('calls.checklist');

  return (
    <SettingsCard title={t('title')}>
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden
          className="bg-warning-tint text-warning-ink mt-px flex size-[22px] shrink-0 items-center justify-center rounded-full"
        >
          <IconX size={13} stroke={2.4} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-px">
          <span className="text-[13.5px] font-semibold">
            {t('noPhone.title', { count: withoutPhone })}
          </span>
          <span className="text-muted-foreground text-xs leading-relaxed">{t('noPhone.body')}</span>
        </div>
        <Link
          href={`/app/${eventId}/guests`}
          className="text-primary shrink-0 text-[12.5px] font-bold"
        >
          {t('action')}
        </Link>
      </div>
    </SettingsCard>
  );
}
