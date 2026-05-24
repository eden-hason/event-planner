import React from 'react';

import { getTranslations } from 'next-intl/server';
import {
  IconCheck,
  IconEye,
  IconMoodSad,
  IconUsers,
  IconX,
} from '@tabler/icons-react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { getScheduleInteractionData, type GuestInteractionRow } from '../queries/guest-interactions';

interface ScheduleInteractionsCardProps {
  scheduleId: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatChip({
  icon,
  label,
  value,
  colorClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  colorClass: string;
}) {
  return (
    <div className="bg-muted/50 flex flex-1 flex-col items-center gap-1 rounded-lg px-3 py-2.5">
      <div className={cn('flex items-center gap-1.5 text-xs font-medium', colorClass)}>
        {icon}
        <span>{label}</span>
      </div>
      <span className="text-foreground text-xl font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function ResponseBadge({ row, t }: { row: GuestInteractionRow; t: (key: string) => string }) {
  if (row.response === 'rsvp_confirm') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600">
        <IconCheck size={11} strokeWidth={2.5} />
        {t('responseConfirmed')}
      </span>
    );
  }
  if (row.response === 'rsvp_decline') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600">
        <IconX size={11} strokeWidth={2.5} />
        {t('responseDeclined')}
      </span>
    );
  }
  return (
    <span className="text-muted-foreground text-xs">{t('responsePending')}</span>
  );
}

export async function ScheduleInteractionsCard({ scheduleId }: ScheduleInteractionsCardProps) {
  const t = await getTranslations('schedules.interactions');
  const data = await getScheduleInteractionData(scheduleId);

  const isEmpty = data.guests.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="bg-primary/10 rounded-md p-1.5">
            <IconUsers size={16} className="text-primary" />
          </div>
          {t('cardTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="bg-muted rounded-full p-3">
              <IconMoodSad size={24} className="text-muted-foreground" strokeWidth={1.5} />
            </div>
            <p className="text-muted-foreground max-w-xs text-sm">{t('emptyDescription')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {/* Summary chips */}
            <div className="flex gap-2">
              <StatChip
                icon={<IconEye size={13} />}
                label={t('views')}
                value={data.summary.views}
                colorClass="text-blue-500"
              />
              <StatChip
                icon={<IconCheck size={13} strokeWidth={2.5} />}
                label={t('confirmed')}
                value={data.summary.confirmed}
                colorClass="text-green-600"
              />
              <StatChip
                icon={<IconX size={13} strokeWidth={2.5} />}
                label={t('declined')}
                value={data.summary.declined}
                colorClass="text-red-500"
              />
            </div>

            {/* Guest rows */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4">
              {/* Header */}
              <span className="text-muted-foreground pb-2 text-xs font-medium uppercase tracking-wide">{t('columnGuest')}</span>
              <span className="text-muted-foreground pb-2 text-center text-xs font-medium uppercase tracking-wide">{t('columnViewed')}</span>
              <span className="text-muted-foreground pb-2 text-xs font-medium uppercase tracking-wide">{t('columnResponse')}</span>
              <span className="text-muted-foreground pb-2 text-xs font-medium uppercase tracking-wide">{t('columnDate')}</span>
              <div className="col-span-4 border-b" />
              {/* Data rows */}
              {data.guests.map((row, index) => (
                <React.Fragment key={row.guestId}>
                  <span className="truncate py-2.5 text-sm font-medium">{row.guestName}</span>
                  <span className="flex justify-center py-2.5">
                    {row.viewed ? (
                      <IconEye size={15} className="text-blue-500" />
                    ) : (
                      <span className="text-muted-foreground/40 text-xs">-</span>
                    )}
                  </span>
                  <span className="py-2.5">
                    <ResponseBadge row={row} t={t} />
                  </span>
                  <span className="text-muted-foreground whitespace-nowrap py-2.5 text-xs">
                    {row.respondedAt
                      ? formatDate(row.respondedAt)
                      : row.viewedAt
                        ? formatDate(row.viewedAt)
                        : '-'}
                  </span>
                  {index < data.guests.length - 1 && <div className="col-span-4 border-b" />}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
