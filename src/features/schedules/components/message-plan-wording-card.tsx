'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { useMessagePlanSettings } from './message-plan-settings-context';
import { RadioCardGroup } from './radio-card-group';
import { SettingsCard } from './settings-card';

/**
 * Which message the Schedule sends: Kululu's text or the Owner's own
 * (brief 6.1). Switching back to Kululu's keeps the draft; a Personal Message
 * left empty sends Kululu's text, and the card says so rather than letting an
 * empty editor look like a choice.
 */
export function MessagePlanWordingCard({ lockBadge }: { lockBadge?: ReactNode }) {
  const t = useTranslations('schedules.messagePlan.wording');
  const { wording, setWording, editable, isSaving, personalBlank } = useMessagePlanSettings();

  return (
    <SettingsCard title={t('cardTitle')} aside={!editable ? lockBadge : undefined}>
      <RadioCardGroup
        label={t('cardTitle')}
        value={wording}
        onChange={setWording}
        disabled={!editable || isSaving}
        options={[
          { value: 'kululu', label: t('kululu.label'), description: t('kululu.description') },
          { value: 'personal', label: t('personal.label'), description: t('personal.description') },
        ]}
      />
      <p className="text-muted-foreground text-xs">{t('sameEitherWay')}</p>
      {wording === 'personal' && personalBlank && (
        <p className="text-warning-strong text-xs font-medium">{t('emptySendsKululu')}</p>
      )}
    </SettingsCard>
  );
}
