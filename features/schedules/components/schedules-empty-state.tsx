'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { IconCalendarPlus } from '@tabler/icons-react';

import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

import { type EventApp } from '@/features/events/schemas';
import { type WhatsAppTemplateApp } from '../schemas';
import { type SuggestedSchedule } from '../utils/suggested-schedules';
import { ScheduleSetupWizard } from './schedule-setup-wizard';
import { SchedulesHeader } from './schedules-header';

interface SchedulesEmptyStateProps {
  eventId: string;
  event: EventApp | null;
  suggestedSchedules: SuggestedSchedule[];
  invitationTemplate: WhatsAppTemplateApp | null;
  targetCounts: { all: number; pending: number; confirmed: number };
}

export function SchedulesEmptyState({
  eventId,
  event,
  suggestedSchedules,
  invitationTemplate,
  targetCounts,
}: SchedulesEmptyStateProps) {
  const t = useTranslations('schedules.setupWizard');
  const [wizardOpen, setWizardOpen] = React.useState(false);

  const hasSuggestions = suggestedSchedules.length > 0;

  return (
    <>
      <SchedulesHeader />

      <Empty className="min-h-[calc(100vh-220px)] border-none bg-card shadow-sm">
        <EmptyMedia>
          <img
            src="/hero-schedules.svg"
            alt=""
            aria-hidden="true"
            className="h-64 w-64"
          />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>{t('emptyTitle')}</EmptyTitle>
          <EmptyDescription>{t('emptyDescription')}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          {hasSuggestions ? (
            <Button onClick={() => setWizardOpen(true)}>
              <IconCalendarPlus className="h-5 w-5" />
              {t('emptyCta')}
            </Button>
          ) : (
            <p className="text-muted-foreground text-sm">
              {t('emptyUnsupported')}
            </p>
          )}
        </EmptyContent>
      </Empty>

      {hasSuggestions && (
        <ScheduleSetupWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          eventId={eventId}
          event={event}
          suggestedSchedules={suggestedSchedules}
          invitationTemplate={invitationTemplate}
          targetCounts={targetCounts}
        />
      )}
    </>
  );
}
