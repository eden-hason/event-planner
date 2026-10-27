'use client';

import { useTranslations } from 'next-intl';

import { Textarea } from '@/components/ui/textarea';

import { PERSONAL_MESSAGE_MAX_LENGTH } from '../schemas';
import { SettingsCard } from './settings-card';
import { useScheduleSettings } from './schedule-settings-context';

/**
 * The Owner's own paragraph, set inside Kululu's frame (ADR 0046).
 *
 * Shown while the Personal Message is the chosen message. Line breaks are
 * accepted here and sent as " | ", which the help line says, since the field
 * itself does not show it. Saved by the page's one Save, not from here.
 */
export function PersonalMessageCard({ lockReason }: { lockReason: 'locked' | 'sent' | null }) {
  const t = useTranslations('schedules.personalMessage');
  const { messageMode, personalMessage, setPersonalMessage, editable } = useScheduleSettings();
  if (messageMode !== 'personal') return null;

  return (
    <SettingsCard
      title={t('title')}
      aside={
        <span className="text-muted-foreground text-[11.5px] tabular-nums">
          {personalMessage.length}/{PERSONAL_MESSAGE_MAX_LENGTH}
        </span>
      }
    >
      <Textarea
        value={personalMessage}
        // Sliced rather than relying on maxLength alone, so a paste that
        // overshoots is trimmed instead of silently rejected whole.
        onChange={(e) =>
          setPersonalMessage(e.target.value.slice(0, PERSONAL_MESSAGE_MAX_LENGTH))
        }
        maxLength={PERSONAL_MESSAGE_MAX_LENGTH}
        placeholder={t('placeholder')}
        readOnly={!editable}
        dir="rtl"
        rows={5}
        className="read-only:bg-muted/60 resize-none"
      />
      <p className="text-muted-foreground text-xs">{t(`help.${lockReason ?? 'editable'}`)}</p>
      {lockReason !== 'sent' && (
        <p className="text-muted-foreground text-xs">{t('help.lineBreaks')}</p>
      )}
    </SettingsCard>
  );
}
