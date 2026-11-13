'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

import type { Wording } from '../message-plan';
import { useMessagePlanSettings } from './message-plan-settings-context';
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
  const selectable = editable && !isSaving;

  const options: { value: Wording; label: string; description: string }[] = [
    { value: 'kululu', label: t('kululu.label'), description: t('kululu.description') },
    { value: 'personal', label: t('personal.label'), description: t('personal.description') },
  ];

  return (
    <SettingsCard title={t('cardTitle')} aside={!editable ? lockBadge : undefined}>
      <div role="radiogroup" aria-label={t('cardTitle')} className="flex flex-col gap-2">
        {options.map((option) => {
          const checked = option.value === wording;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-disabled={!selectable}
              disabled={!selectable}
              onClick={() => setWording(option.value)}
              className={cn(
                'flex flex-col gap-0.5 rounded-xl border-[1.5px] p-3 text-start transition-colors',
                checked ? 'border-primary bg-primary/5' : 'border-border',
                selectable && !checked && 'hover:border-primary/50',
                !selectable && 'cursor-default',
              )}
            >
              <span className="text-sm font-semibold">{option.label}</span>
              <span className="text-muted-foreground text-xs leading-relaxed">
                {option.description}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-muted-foreground text-xs">{t('sameEitherWay')}</p>
      {wording === 'personal' && personalBlank && (
        <p className="text-warning-strong text-xs font-medium">{t('emptySendsKululu')}</p>
      )}
    </SettingsCard>
  );
}
