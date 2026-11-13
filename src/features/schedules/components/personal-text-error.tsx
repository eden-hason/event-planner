'use client';

import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

import type { PersonalTextError } from '../message-plan';
import { personalTextErrorMessage } from '../utils/message-plan-editor';

/**
 * Why a Personal Message cannot be saved, in the Owner's words, and for a
 * Message Field the Event has no value for, the way to fix it: fill it in on
 * the Event details, or (`onRemove`) take it out of the message (brief 7.3).
 * The editor and the Save bar say it the same way.
 */
export function PersonalTextErrorText({
  error,
  eventId,
  onRemove,
}: {
  error: PersonalTextError;
  eventId: string;
  onRemove?: () => void;
}) {
  const t = useTranslations('schedules.messagePlan');
  const message = personalTextErrorMessage(error);
  const fixable = message.key === 'emptyField';

  return (
    <>
      {t(`errors.${message.key}`, {
        ...message.values,
        field: message.field ? t(`fields.${message.field}`) : '',
      })}
      {fixable && (
        <>
          {' '}
          <Link href={`/app/${eventId}/details`} className="font-semibold underline underline-offset-2">
            {t('editor.fix.details')}
          </Link>
        </>
      )}
      {fixable && onRemove && (
        <>
          {' · '}
          <button type="button" onClick={onRemove} className="font-semibold underline underline-offset-2">
            {t('editor.fix.remove')}
          </button>
        </>
      )}
    </>
  );
}
