'use client';

import { useTranslations } from 'next-intl';

import { PageSaveBar } from '@/components/page-save-bar';

import { useMessagePlanSettings } from './message-plan-settings-context';
import { PersonalTextErrorText } from './personal-text-error';

/**
 * The Save for an open Schedule on the current Message Plan: the same bar as
 * every Schedule, shown while something is unsaved. When the Personal
 * Message cannot be saved it says why in place of what is unsaved, and for a
 * Message Field the Event has no value for, where to fill it in (brief 7.3).
 * A Due Time the timing card flags keeps Save inert, as on Classic.
 */
export function MessagePlanSaveBar() {
  const tFields = useTranslations('schedules.detail.saveBar.fields');
  const { changes, isSaving, save, revert, dueTimeIssue, textErrors, event } =
    useMessagePlanSettings();

  const only = changes.length === 1 ? changes[0] : null;
  const first = textErrors[0];
  const error = first ? <PersonalTextErrorText error={first} eventId={event.id} /> : null;

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
