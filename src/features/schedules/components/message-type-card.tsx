'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

import { SettingsCard } from './settings-card';
import { useScheduleSettings, type MessageMode } from './schedule-settings-context';

interface MessageTypeCardProps {
  /** Whether this Schedule Type has a Personal Message family to send. */
  offersPersonalMessage: boolean;
  /**
   * Shown once the Schedule has gone out and the choice can no longer change.
   * Rendered server-side and passed in - see ScheduleLockBadge.
   */
  lockBadge?: ReactNode;
}

/**
 * Which message this Schedule sends: Kululu's, or the Owner's Personal Message
 * (ADR 0046).
 *
 * Kululu's side is one option, not a list of Variants. `schedules.template_id`
 * names a *family* and the resolver picks the row inside it from the Event's
 * configuration, so the organiser never chooses a row, and only one Variant per
 * Schedule Type is authored. When a second one is approved it joins this group
 * without the layout changing.
 *
 * The choice is not stored. A Schedule sends its Personal Message exactly when
 * it carries the text, so picking Kululu's here clears that text on save.
 */
export function MessageTypeCard({ offersPersonalMessage, lockBadge }: MessageTypeCardProps) {
  const t = useTranslations('schedules.messageType');
  const { messageMode, setMessageMode, editable } = useScheduleSettings();

  const options: { mode: MessageMode; label: string; description: string }[] = [
    { mode: 'variant', label: t('default.label'), description: t('default.description') },
  ];
  if (offersPersonalMessage) {
    options.push({
      mode: 'personal',
      label: t('personal.label'),
      description: t('personal.description'),
    });
  }
  // With nothing to choose between, the one option is shown checked and
  // disabled rather than as a group with nothing selectable in it.
  const selectable = editable && options.length > 1;
  const selected = offersPersonalMessage ? messageMode : 'variant';

  return (
    <SettingsCard
      title={t('cardTitle')}
      aside={lockBadge}
    >
      <div role="radiogroup" aria-label={t('cardTitle')} className="flex flex-col gap-2">
        {options.map((option) => {
          const checked = option.mode === selected;
          return (
            <button
              key={option.mode}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-disabled={!selectable}
              disabled={!selectable}
              onClick={() => setMessageMode(option.mode)}
              className={cn(
                'flex items-start gap-2.5 rounded-xl border-[1.5px] p-3 text-start transition-colors',
                checked ? 'border-primary bg-primary/5' : 'border-border',
                selectable && !checked && 'hover:border-primary/50',
                !selectable && 'cursor-default',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border-2',
                  checked ? 'border-primary' : 'border-muted-foreground/40',
                )}
              >
                {checked && <span className="bg-primary size-[7px] rounded-full" />}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-semibold">{option.label}</span>
                {/* Deliberately not `message_templates.description`: that column
                    is operator-facing English for the Back Office, and it would
                    surface untranslated on a Hebrew page. */}
                <span className="text-muted-foreground text-xs leading-relaxed">
                  {option.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </SettingsCard>
  );
}
