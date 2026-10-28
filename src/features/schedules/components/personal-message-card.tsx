'use client';

import { useTranslations } from 'next-intl';

import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/toggle-switch';

import { PERSONAL_MESSAGE_MAX_LENGTH } from '../schemas';
import { SettingsCard } from './settings-card';
import { useScheduleSettings } from './schedule-settings-context';

/**
 * The Owner's own paragraph, set inside Kululu's frame (ADR 0046).
 *
 * Shown while the Personal Message is the chosen message. Line breaks are
 * accepted here and sent as " | ", which the help line says, since the field
 * itself does not show it. Saved by the page's one Save, not from here.
 *
 * Where the family offers a Bare Frame, the Owner may also drop the Event's
 * details from the frame and write them, or leave them out, themselves. The
 * switch reads as keeping the details, the frame's default.
 */
export function PersonalMessageCard({
  lockReason,
  offersBareFrame,
}: {
  lockReason: 'locked' | 'sent' | null;
  offersBareFrame: boolean;
}) {
  const t = useTranslations('schedules.personalMessage');
  const { messageMode, personalMessage, setPersonalMessage, bareFrame, setBareFrame, editable } =
    useScheduleSettings();
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
      {lockReason !== 'sent' && (
        <p className="text-muted-foreground text-xs">{t('help.lineBreaks')}</p>
      )}
      {offersBareFrame && (
        <div className="flex items-center justify-between gap-3 border-t pt-3">
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm font-semibold">{t('eventDetails.label')}</span>
            <span className="text-muted-foreground text-xs leading-relaxed">
              {t('eventDetails.description')}
            </span>
          </span>
          <Switch
            aria-label={t('eventDetails.label')}
            checked={!bareFrame}
            onCheckedChange={(checked) => setBareFrame(!checked)}
            disabled={!editable}
          />
        </div>
      )}
    </SettingsCard>
  );
}
