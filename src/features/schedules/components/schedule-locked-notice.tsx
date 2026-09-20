import { useTranslations } from 'next-intl';
import { IconLock } from '@tabler/icons-react';

import { NoticeBanner } from './notice-banner';

/**
 * What a locked Schedule says for itself.
 *
 * The timeline already carries the one upsell banner, so this is not a second
 * pitch: it explains that everything on this screen is real and already
 * written, and that only sending is gated. The organiser drilled in to read
 * the message, and the honest thing is to let them - then tell them what the
 * one closed door is. It carries no action of its own for the same reason.
 */
export function ScheduleLockedNotice() {
  const t = useTranslations('schedules.locked');

  return (
    <NoticeBanner tone="warning" icon={IconLock} title={t('title')}>
      {t('description')}
    </NoticeBanner>
  );
}
