'use client';

import { useTranslations } from 'next-intl';
import { IconCheck, IconMailForward, IconClockPause, IconInfoCircle } from '@tabler/icons-react';

import { cn } from '@/lib/utils';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';

import { type EventApp } from '@/features/events/schemas';
import { type WhatsAppTemplateApp } from '../../schemas';
import { MessageContentCard } from '../message-content-card';

type InvitationDecision = 'send' | 'skip';

interface WizardInvitationStepProps {
  template: WhatsAppTemplateApp | null;
  event: EventApp | null;
  decision: InvitationDecision;
  onDecisionChange: (decision: InvitationDecision) => void;
  sendDate: Date | undefined;
  onSendDateChange: (date: Date | undefined) => void;
}

export function WizardInvitationStep({
  template,
  event,
  decision,
  onDecisionChange,
  sendDate,
  onSendDateChange,
}: WizardInvitationStepProps) {
  const t = useTranslations('schedules.setupWizard');

  const options: {
    value: InvitationDecision;
    label: string;
    description: string;
    icon: React.ElementType;
    iconClass: string;
  }[] = [
    {
      value: 'send',
      label: t('decisionSend'),
      description: t('decisionSendDesc'),
      icon: IconMailForward,
      iconClass: 'bg-primary/10 text-primary',
    },
    {
      value: 'skip',
      label: t('decisionSkip'),
      description: t('decisionSkipDesc'),
      icon: IconClockPause,
      iconClass: 'bg-muted text-muted-foreground',
    },
  ];

  return (
    <div className="space-y-5">
      <MessageContentCard template={template} event={event} />

      <div className="border-primary/20 bg-primary/5 text-primary flex items-start gap-2.5 rounded-lg border px-3.5 py-3">
        <IconInfoCircle className="mt-px size-4 shrink-0" />
        <p className="text-xs leading-relaxed">{t('invitationPrivacyNote')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {options.map((option) => {
          const isSelected = decision === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onDecisionChange(option.value)}
              className={cn(
                'relative flex flex-col items-start gap-3 rounded-lg border-2 p-4 text-start transition-colors',
                isSelected
                  ? 'border-primary bg-primary/[0.02]'
                  : 'border-border hover:border-muted-foreground/30 hover:bg-muted/50',
              )}
            >
              <div className="flex w-full items-start justify-between">
                <div
                  className={cn(
                    'flex size-10 items-center justify-center rounded-lg',
                    option.iconClass,
                  )}
                >
                  <option.icon className="size-5" />
                </div>
                <div
                  className={cn(
                    'flex size-5 items-center justify-center rounded-full border-2 transition-colors',
                    isSelected
                      ? 'border-primary bg-primary text-white'
                      : 'border-muted-foreground/30',
                  )}
                >
                  {isSelected && <IconCheck className="size-3" stroke={3} />}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold">{option.label}</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {option.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className={cn('space-y-1.5', decision === 'skip' && 'opacity-50')}>
        <Label className="text-muted-foreground text-xs tracking-wide">
          {t('sendDateLabel')}
        </Label>
        <DatePicker
          date={sendDate}
          onDateChange={onSendDateChange}
          disabled={decision === 'skip'}
        />
        <p className="text-muted-foreground text-xs">{t('sendDateHelper')}</p>
      </div>
    </div>
  );
}
