import { getTranslations } from 'next-intl/server';
import {
  IconEye,
  IconMessageCircle,
  IconMoodSad,
  IconSend,
  IconUsers,
} from '@tabler/icons-react';

import { StatChip } from '@/components/stat-chip';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { getScheduleInteractionData } from '../queries/guest-interactions';
import { GuestInteractionsTable } from './guest-interactions-table';
import { InteractionsRefreshButton } from './interactions-refresh-button';

interface ScheduleInteractionsCardProps {
  scheduleId: string;
  /**
   * Whether this schedule asks guests to RSVP (a Confirmation round). Other
   * message types still report who they reached, but an answer column that
   * reads "No response" on every row of a reminder is noise.
   */
  collectsRsvp: boolean;
}

export async function ScheduleInteractionsCard({
  scheduleId,
  collectsRsvp,
}: ScheduleInteractionsCardProps) {
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
              <IconMoodSad
                size={24}
                className="text-muted-foreground"
                strokeWidth={1.5}
              />
            </div>
            <p className="text-muted-foreground max-w-xs text-sm">
              {t('emptyDescription')}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {/* The funnel, in guest records: meant for -> reached -> opened -> answered
                (answered only where the schedule collects RSVPs).
                Read receipts are not a step of their own - SMS cannot produce one,
                so a "read" step would make every SMS guest look worse. */}
            <div
              className={
                collectsRsvp
                  ? 'grid grid-cols-2 gap-2 sm:flex'
                  : 'grid grid-cols-3 gap-2'
              }
            >
              <StatChip
                icon={<IconUsers size={13} />}
                label={t('audience')}
                value={data.summary.audience}
                hint={
                  data.summary.excludedNoPhone > 0
                    ? t('audienceExcluded', {
                        count: data.summary.excludedNoPhone,
                      })
                    : undefined
                }
                accentClassName="text-muted-foreground"
              />
              <StatChip
                icon={<IconSend size={13} />}
                label={t('reached')}
                value={data.summary.reached}
                hint={t('reachedChannels', {
                  whatsapp: data.summary.reachedWhatsapp,
                  sms: data.summary.reachedSms,
                })}
                accentClassName="text-primary"
              />
              <StatChip
                icon={<IconEye size={13} />}
                label={t('views')}
                value={data.summary.views}
                accentClassName="text-primary"
              />
              {collectsRsvp && (
                <StatChip
                  icon={<IconMessageCircle size={13} />}
                  label={t('responded')}
                  value={data.summary.confirmed + data.summary.declined}
                  hint={t('respondedBreakdown', {
                    confirmed: data.summary.confirmedGuests,
                    declined: data.summary.declined,
                  })}
                  accentClassName="text-primary"
                />
              )}
            </div>
            <GuestInteractionsTable
              guests={data.guests}
              notReached={data.summary.notReached}
              collectsRsvp={collectsRsvp}
              labels={{
                columnGuest: t('columnGuest'),
                columnViewed: t('columnViewed'),
                columnResponse: t('columnResponse'),
                columnAmount: t('columnAmount'),
                columnDate: t('columnDate'),
                responseConfirmed: t('responseConfirmed'),
                responseDeclined: t('responseDeclined'),
                responsePending: t('responsePending'),
                columnDelivery: t('columnDelivery'),
                deliveryWhatsapp: t('delivery.whatsapp'),
                deliverySms: t('delivery.sms'),
                deliveryOnItsWay: t('delivery.onItsWay'),
                deliveryNotDelivered: t('delivery.notDelivered'),
                deliveryNoPhone: t('delivery.noPhone'),
                notReached: t('notReached', {
                  count:
                    data.summary.notReached.onItsWay +
                    data.summary.notReached.notDelivered +
                    data.summary.notReached.noPhone,
                }),
                filterAll: t('filterAll'),
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
