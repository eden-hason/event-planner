'use client';

import { IconCheck } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

import { ScheduleFooter } from './schedule-footer';
import { useScheduleSettings } from './schedule-settings-context';

/**
 * The one Save for an open message Schedule, stuck to the bottom of the screen.
 *
 * While something can still be edited it holds Save, inert until a field
 * changes so pressing it is always meaningful. A locked Schedule holds the one
 * action that unlocks it instead. A sent Schedule keeps the bar only for the
 * sentence that says why nothing here saves.
 */
export function ScheduleSaveBar({ note }: { note: 'editable' | 'locked' | 'sent' }) {
  const t = useTranslations('schedules.detail');
  const { editable, dirty, isSaving, save } = useScheduleSettings();

  return (
    <ScheduleFooter note={t(`footNote.${note}`)} upgrade={note === 'locked'}>
      {editable && (
        <Button
          type="button"
          onClick={save}
          disabled={!dirty || isSaving}
          className="w-full rounded-xl text-base font-bold"
        >
          <IconCheck stroke={2.4} />
          {isSaving ? t('save.saving') : t('save.action')}
        </Button>
      )}
    </ScheduleFooter>
  );
}
