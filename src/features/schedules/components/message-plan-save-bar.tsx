'use client';

import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { PageSaveBar } from '@/components/page-save-bar';

import { personalTextErrorMessage } from '../utils/message-plan-editor';
import { useMessagePlanSettings } from './message-plan-settings-context';

/**
 * The Save for an open Schedule on the current Message Plan: the same bar as
 * every Schedule, shown while something is unsaved. When the Personal
 * Message cannot be saved it says why in place of what is unsaved, and for a
 * Message Field the Event has no value for, where to fill it in (brief 7.3).
 * A Due Time the timing card flags keeps Save inert, as on Classic.
 */
export function MessagePlanSaveBar() {
  const t = useTranslations('schedules.messagePlan');
  const tFields = useTranslations('schedules.detail.saveBar.fields');
  const { changes, isSaving, save, revert, dueTimeIssue, textErrors, event } =
    useMessagePlanSettings();

  const only = changes.length === 1 ? changes[0] : null;
  const first = textErrors[0];
  const message = first ? personalTextErrorMessage(first) : null;

  const error = message ? (
    <span className="flex flex-wrap items-center gap-x-1.5">
      <span>
        {t(`errors.${message.key}`, {
          ...message.values,
          field: message.field ? t(`fields.${message.field}`) : '',
        })}
      </span>
      {message.key === 'emptyField' && (
        <Link
          href={`/app/${event.id}/details`}
          className="font-semibold underline underline-offset-2"
        >
          {t('editor.fix.details')}
        </Link>
      )}
    </span>
  ) : null;

  return (
    <PageSaveBar
      open={changes.length > 0}
      count={changes.length}
      field={only ? tFields(only) : undefined}
      isSaving={isSaving}
      onCancel={revert}
      onSave={save}
      saveDisabled={dueTimeIssue !== null || textErrors.length > 0}
      error={error}
    />
  );
}
