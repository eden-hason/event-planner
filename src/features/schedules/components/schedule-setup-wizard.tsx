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
    () => suggestedSchedules.find((s) => s.scheduleTypeKey === 'initial_invitation'),
    [suggestedSchedules],
  );

  const buildRows = React.useCallback(
    (): TimelineRow[] =>
      suggestedSchedules
        .filter((s) => s.scheduleTypeKey !== 'initial_invitation')
        .map((s, index) => ({
          key: `${s.templateKey}-${index}`,
          scheduleTypeId: s.scheduleTypeId,
          scheduleTypeKey: s.scheduleTypeKey,
          templateId: s.templateId,
          targetStatus: s.targetStatus,
          enabled: true,
          date: new Date(s.scheduledDate),
          time: s.defaultTime,
          deliveryMethod: s.deliveryMethod,
        })),
    [suggestedSchedules],
  );

  const scrollRef = React.useRef<HTMLDivElement>(null);
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
    scrollRef.current?.scrollTo({ top: 0 });
  };

  // Smoothly scroll the content back to the top whenever the step changes,
  // so switching screens never leaves the user mid-scroll on the new step.
  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

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
        scheduleTypeId: invitationSuggestion.scheduleTypeId,
        templateId: invitationSuggestion.templateId,
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
        scheduleTypeId: row.scheduleTypeId,
        templateId: row.templateId,
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
      <DialogContent className="flex max-h-[85dvh] flex-col sm:max-w-lg">
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

        <div ref={scrollRef} className="-mx-6 min-h-0 flex-1 overflow-y-auto px-6">
          {/* Scroll fade: header dissolves into the scrolling content below;
              sits over the pt-4 when scrolled to the very top */}
          <div
            aria-hidden
            className="from-background pointer-events-none sticky top-0 z-10 -mx-6 -mb-4 h-4 bg-gradient-to-b to-transparent"
          />
          <div className="pt-4 pb-8">
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
          </div>
          {/* Scroll fade: content dissolves into the background above the
              pinned footer; sits over the pb-8 when fully scrolled */}
          <div
            aria-hidden
            className="from-background pointer-events-none sticky bottom-0 z-10 -mx-6 -mt-8 h-8 bg-gradient-to-t to-transparent"
          />
        </div>

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
