'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import { useRouter } from '@/i18n/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { type EventApp } from '@/features/events/schemas';
import { createSchedulesFromSelection } from '../actions';
import { type ScheduleSelectionItem, type WhatsAppTemplateApp } from '../schemas';
import { type SuggestedSchedule } from '../utils/suggested-schedules';
import { WizardInvitationStep } from './wizard/wizard-invitation-step';
import {
  WizardTimelineStep,
  type TimelineRow,
} from './wizard/wizard-timeline-step';

interface ScheduleSetupWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  event: EventApp | null;
  suggestedSchedules: SuggestedSchedule[];
  invitationTemplate: WhatsAppTemplateApp | null;
  targetCounts: { all: number; pending: number; confirmed: number };
}

type Step = 'invitation' | 'timeline';
type InvitationDecision = 'send' | 'skip';

function combineDateTime(date: Date, time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  // The date picker yields a Date at local midnight, so combine using local
  // components — setUTCHours would shift to the previous day in +UTC zones.
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result.toISOString();
}

export function ScheduleSetupWizard({
  open,
  onOpenChange,
  eventId,
  event,
  suggestedSchedules,
  invitationTemplate,
  targetCounts,
}: ScheduleSetupWizardProps) {
  const t = useTranslations('schedules.setupWizard');
  const router = useRouter();

  const invitationSuggestion = React.useMemo(
    () => suggestedSchedules.find((s) => s.actionType === 'initial_invitation'),
    [suggestedSchedules],
  );

  const buildRows = React.useCallback(
    (): TimelineRow[] =>
      suggestedSchedules
        .filter((s) => s.actionType !== 'initial_invitation')
        .map((s, index) => ({
          key: `${s.templateKey}-${index}`,
          templateKey: s.templateKey,
          actionType: s.actionType,
          targetStatus: s.targetStatus,
          enabled: true,
          date: new Date(s.scheduledDate),
          time: s.defaultTime,
        })),
    [suggestedSchedules],
  );

  const [step, setStep] = React.useState<Step>('invitation');
  const [isPending, setIsPending] = React.useState(false);
  const [invitationDecision, setInvitationDecision] =
    React.useState<InvitationDecision>('send');
  const [invitationDate, setInvitationDate] = React.useState<Date | undefined>(
    invitationSuggestion ? new Date(invitationSuggestion.scheduledDate) : undefined,
  );
  const [rows, setRows] = React.useState<TimelineRow[]>(buildRows);

  const resetState = () => {
    setStep('invitation');
    setInvitationDecision('send');
    setInvitationDate(
      invitationSuggestion
        ? new Date(invitationSuggestion.scheduledDate)
        : undefined,
    );
    setRows(buildRows());
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetState();
    onOpenChange(next);
  };

  const handleSubmit = () => {
    const selections: ScheduleSelectionItem[] = [];

    // Opted-out schedules are still created, just disabled ('cancelled'),
    // so they remain visible on the schedules page and can be enabled later.
    if (invitationSuggestion && invitationDate) {
      selections.push({
        templateKey: invitationSuggestion.templateKey,
        actionType: invitationSuggestion.actionType,
        scheduledDate: combineDateTime(
          invitationDate,
          invitationSuggestion.defaultTime,
        ),
        scheduledTime: invitationSuggestion.defaultTime,
        targetStatus: invitationSuggestion.targetStatus,
        status: invitationDecision === 'send' ? null : 'cancelled',
      });
    }

    for (const row of rows) {
      selections.push({
        templateKey: row.templateKey,
        actionType: row.actionType,
        scheduledDate: combineDateTime(row.date, row.time),
        scheduledTime: row.time,
        targetStatus: row.targetStatus,
        status: row.enabled ? null : 'cancelled',
      });
    }

    setIsPending(true);

    const promise = createSchedulesFromSelection(eventId, selections).then(
      (result) => {
        if (!result.success) {
          throw new Error(result.message ?? t('toast.failed'));
        }
        return result;
      },
    );

    toast.promise(promise, {
      loading: t('toast.creating'),
      success: t('toast.created'),
      error: (err) => (err instanceof Error ? err.message : t('toast.error')),
    });

    promise
      .then(() => {
        handleOpenChange(false);
        router.refresh();
      })
      .catch(() => {
        // error surfaced via toast
      })
      .finally(() => setIsPending(false));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 'invitation' ? t('step1Title') : t('step2Title')}
          </DialogTitle>
          <DialogDescription>
            {step === 'invitation'
              ? t('step1Description')
              : t('step2Description')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1.5">
          {(['invitation', 'timeline'] as const).map((s) => (
            <span
              key={s}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors',
                step === s || (step === 'timeline' && s === 'invitation')
                  ? 'bg-primary'
                  : 'bg-muted',
              )}
            />
          ))}
        </div>

        {step === 'invitation' ? (
          <WizardInvitationStep
            template={invitationTemplate}
            event={event}
            decision={invitationDecision}
            onDecisionChange={setInvitationDecision}
            sendDate={invitationDate}
            onSendDateChange={setInvitationDate}
          />
        ) : (
          <WizardTimelineStep
            rows={rows}
            onRowsChange={setRows}
            targetCounts={targetCounts}
            eventDate={event?.eventDate}
          />
        )}

        <div className="border-border -mx-6 border-t" />

        <DialogFooter>
          {step === 'invitation' ? (
            <Button onClick={() => setStep('timeline')}>{t('continue')}</Button>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => setStep('invitation')}
                disabled={isPending}
              >
                {t('back')}
              </Button>
              <Button onClick={handleSubmit} disabled={isPending}>
                {isPending ? t('submitting') : t('submit')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
