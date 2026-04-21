'use client';

import { useTranslations } from 'next-intl';
import { IconCalendarClock, IconChartDots3 } from '@tabler/icons-react';

import { Button } from '@/components/ui/button';
import { type ScheduleApp } from '../schemas';
import { SendConfirmDialog } from './send-confirm-dialog';

interface DeliveryEmptyStateProps {
  scheduleId: string;
  scheduledDate: string;
  guestCount: number;
  targetStatus: ScheduleApp['targetStatus'];
}

export function DeliveryEmptyState({ scheduleId, scheduledDate, guestCount, targetStatus }: DeliveryEmptyStateProps) {
  const t = useTranslations('schedules.emptyState');
  const formattedDate = new Date(scheduledDate).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const handleEditSchedule = () => {
    document.getElementById('schedule-details-tab-trigger')?.click();
  };

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      {/* Icon with ambient glow */}
      <div className="relative mb-8">
        <div className="absolute inset-0 scale-[2.5] rounded-full bg-primary/5 opacity-50 blur-3xl" />
        <div className="relative flex items-center justify-center rounded-3xl border border-slate-100 bg-white p-8 shadow-xl">
          <IconChartDots3
            size={64}
            className="animate-pulse text-primary opacity-80"
            strokeWidth={1.25}
          />
        </div>
      </div>

      <h3 className="mb-3 text-2xl font-bold text-slate-900">{t('title')}</h3>

      <p className="max-w-md leading-relaxed text-slate-500">
        {t('description', { date: formattedDate })}
      </p>

      <div className="mt-10 flex gap-3">
        <SendConfirmDialog
          scheduleId={scheduleId}
          guestCount={guestCount}
          targetStatus={targetStatus}
          triggerClassName="shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5"
          disabled
        />
        <Button
          variant="outline"
          onClick={handleEditSchedule}
          className="gap-2"
        >
          <IconCalendarClock size={16} />
          {t('editSchedule')}
        </Button>
      </div>
    </div>
  );
}
