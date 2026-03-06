import {
  IconCircleCheck,
  IconCircleX,
  IconSend,
  IconEyeCheck,
} from '@tabler/icons-react';
import { StatsCards, type StatItem } from '@/components/ui/stats-cards';
import { getRsvpStats } from '../queries/guest-interactions';
import { getDeliveryStats } from '../queries/message-deliveries';
import { type ScheduleApp } from '../schemas';
import { DeliveryEmptyState } from './delivery-empty-state';
import { RecentDeliveryActivity } from './recent-delivery-activity';

interface SchedulePerformanceCardProps {
  scheduleId: string;
  scheduledDate: string;
  guestCount: number;
  targetStatus: ScheduleApp['targetStatus'];
  actionType: ScheduleApp['actionType'];
  eventId: string;
}

export async function SchedulePerformanceCard({
  scheduleId,
  scheduledDate,
  guestCount,
  targetStatus,
  actionType,
  eventId,
}: SchedulePerformanceCardProps) {
  const isConfirmation = actionType === 'confirmation';

  const [deliveryStats, rsvpStats] = await Promise.all([
    getDeliveryStats(scheduleId),
    isConfirmation
      ? getRsvpStats(scheduleId)
      : Promise.resolve({ confirmed: 0, declined: 0 }),
  ]);

  const isEmpty = isConfirmation
    ? deliveryStats.read === 0 &&
      rsvpStats.confirmed === 0 &&
      rsvpStats.declined === 0
    : deliveryStats.successful === 0 && deliveryStats.read === 0;

  if (isEmpty) {
    return (
      <DeliveryEmptyState
        scheduleId={scheduleId}
        scheduledDate={scheduledDate}
        guestCount={guestCount}
        targetStatus={targetStatus}
      />
    );
  }

  const successful = deliveryStats.successful;
  const failed = deliveryStats.failed;
  const totalAttempts = successful + failed;

  const stats: StatItem[] = isConfirmation
    ? [
        {
          label: 'Total Deliveries',
          status: null,
          value: totalAttempts,
          pct: 0,
          barColor: '',
          icon: <IconSend size={20} className="text-teal-500" />,
          activeRing: '',
          breakdown: [
            { label: 'Success', value: successful, color: 'bg-teal-500' },
            {
              label: 'Failed',
              value: failed,
              color: 'bg-orange-500',
            },
          ],
        },
        {
          label: 'Read',
          status: null,
          value: deliveryStats.read,
          pct:
            successful > 0
              ? Math.round((deliveryStats.read / successful) * 100)
              : 0,
          icon: <IconEyeCheck size={20} className="text-blue-500" />,
          barColor: 'bg-blue-500',
          activeRing: '',
        },
        {
          label: 'Confirmed',
          status: null,
          value: rsvpStats.confirmed,
          pct:
            successful > 0
              ? Math.round((rsvpStats.confirmed / successful) * 100)
              : 0,
          icon: <IconCircleCheck size={20} className="text-green-500" />,
          barColor: 'bg-green-500',
          activeRing: '',
        },
        {
          label: 'Declined',
          status: null,
          value: rsvpStats.declined,
          pct:
            successful > 0
              ? Math.round((rsvpStats.declined / successful) * 100)
              : 0,
          icon: <IconCircleX size={20} className="text-red-500" />,
          barColor: 'bg-red-500',
          activeRing: '',
        },
      ]
    : [
        {
          label: 'Total Deliveries',
          status: null,
          value: totalAttempts,
          pct: 0,
          barColor: '',
          icon: <IconSend size={20} className="text-teal-500" />,
          activeRing: '',
          breakdown: [
            { label: 'Success', value: successful, color: 'bg-teal-500' },
            {
              label: 'Failed',
              value: failed,
              color: 'bg-orange-500',
            },
          ],
        },
        {
          label: 'Read',
          status: null,
          value: deliveryStats.read,
          pct:
            successful > 0
              ? Math.round((deliveryStats.read / successful) * 100)
              : 0,
          icon: <IconEyeCheck size={20} className="text-blue-500" />,
          barColor: 'bg-blue-500',
          activeRing: '',
        },
      ];

  return (
    <div className="space-y-6">
      <StatsCards stats={stats} columns={isConfirmation ? 4 : 2} />
      <RecentDeliveryActivity scheduleId={scheduleId} eventId={eventId} showRsvpDetails={isConfirmation} />
    </div>
  );
}
