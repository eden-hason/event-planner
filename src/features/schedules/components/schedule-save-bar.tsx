'use client';

import { useTranslations } from 'next-intl';

import { PageSaveBar } from '@/components/page-save-bar';

import { useScheduleSettings } from './schedule-settings-context';

/**
 * The Save for an open message Schedule, and it only shows while there is
 * something to save - the same bar as the Event details page.
 *
 * A single change is named rather than counted, so the Owner sees what is left
 * as well as that something is. Save stays inert while the edited Due Time is
 * one the details card has flagged as unsaveable; Cancel puts every field back.
 */
export function ScheduleSaveBar() {
  const t = useTranslations('schedules.detail.saveBar');
  const { changes, isSaving, save, revert, dueTimeIssue } =
    useScheduleSettings();

  const only = changes.length === 1 ? changes[0] : null;

  return (
    <PageSaveBar
      open={changes.length > 0}
      count={changes.length}
      field={only ? t(`fields.${only}`) : undefined}
      isSaving={isSaving}
      onCancel={revert}
      onSave={save}
      saveDisabled={dueTimeIssue !== null}
    />
  );
}
