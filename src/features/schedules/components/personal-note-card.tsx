'use client';

import { useTranslations } from 'next-intl';

import { Textarea } from '@/components/ui/textarea';

import { CUSTOM_TEXT_MAX_LENGTH } from '../schemas';
import { SettingsCard } from './settings-card';
import { useScheduleSettings } from './schedule-settings-context';

/**
 * The organiser's own line at the end of the message, above the reply buttons.
 *
 * Shown only for a Schedule whose family has a note variant at all. Saved by
 * the page's one Save, not from here.
 */
export function PersonalNoteCard({ lockReason }: { lockReason: 'locked' | 'sent' | null }) {
  const t = useTranslations('schedules.personalNote');
  const { note, setNote, editable } = useScheduleSettings();

  return (
    <SettingsCard
      title={t('title')}
      aside={
        <span className="text-muted-foreground text-[11.5px] tabular-nums">
          {note.length}/{CUSTOM_TEXT_MAX_LENGTH}
        </span>
      }
    >
      <Textarea
        value={note}
        // Sliced rather than relying on maxLength alone, so a paste that
        // overshoots is trimmed instead of silently rejected whole.
        onChange={(e) => setNote(e.target.value.slice(0, CUSTOM_TEXT_MAX_LENGTH))}
        maxLength={CUSTOM_TEXT_MAX_LENGTH}
        placeholder={t('placeholder')}
        readOnly={!editable}
        dir="rtl"
        rows={3}
        className="read-only:bg-muted/60 min-h-[78px] resize-none rounded-[11px]"
      />
      <p className="text-muted-foreground text-xs">{t(`help.${lockReason ?? 'editable'}`)}</p>
    </SettingsCard>
  );
}
