import { getTranslations } from 'next-intl/server';
import {
  IconCheck,
  IconEye,
  IconMoodSad,
  IconUsers,
  IconX,
} from '@tabler/icons-react';

import { StatChip } from '@/components/stat-chip';
import { rsvpPresentation } from '@/features/guests';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { getScheduleInteractionData } from '../queries/guest-interactions';
import { GuestInteractionsTable } from './guest-interactions-table';
import { InteractionsRefreshButton } from './interactions-refresh-button';

interface ScheduleInteractionsCardProps {
  scheduleId: string;
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
        <CardAction>
          <InteractionsRefreshButton />
        </CardAction>
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
            <div className="flex gap-2">
              <StatChip
                icon={<IconEye size={13} />}
                label={t('views')}
                value={data.summary.views}
                accentClassName={'text-primary'}
              />
              <StatChip
                icon={<IconCheck size={13} strokeWidth={2.5} />}
                label={t('confirmed')}
                value={data.summary.confirmed}
                hint={t('confirmedGuests', { count: data.summary.confirmedGuests })}
                accentClassName={rsvpPresentation('confirmed').accent}
              />
              <StatChip
                icon={<IconX size={13} strokeWidth={2.5} />}
                label={t('declined')}
                value={data.summary.declined}
                accentClassName={rsvpPresentation('declined').accent}
              />
            </div>
            <GuestInteractionsTable
              guests={data.guests}
              labels={{
                columnGuest: t('columnGuest'),
                columnViewed: t('columnViewed'),
                columnResponse: t('columnResponse'),
                columnAmount: t('columnAmount'),
                columnDate: t('columnDate'),
                responseConfirmed: t('responseConfirmed'),
                responseDeclined: t('responseDeclined'),
                responsePending: t('responsePending'),
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
