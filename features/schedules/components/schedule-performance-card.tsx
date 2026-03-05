import { IconCircleCheck, IconCircleX, IconEye, IconSend } from '@tabler/icons-react';
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
  eventId: string;
}

export async function SchedulePerformanceCard({
  scheduleId,
  scheduledDate,
  guestCount,
  targetStatus,
  eventId,
}: SchedulePerformanceCardProps) {
  const [deliveryStats, rsvpStats] = await Promise.all([
    getDeliveryStats(scheduleId),
    getRsvpStats(scheduleId),
  ]);

  if (deliveryStats.read === 0 && rsvpStats.confirmed === 0 && rsvpStats.declined === 0) {
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
  const totalAttempts = successful + deliveryStats.failed;

  const stats: StatItem[] = [
    {
      label: 'Total Deliveries',
      status: null,
      value: totalAttempts,
      pct: 0,
      barColor: '',
      icon: <IconSend size={16} className="text-muted-foreground" />,
      activeRing: '',
      breakdown: [
        { label: 'Success', value: successful, color: 'bg-teal-500' },
        { label: 'Failed', value: deliveryStats.failed, color: 'bg-orange-500' },
      ],
    },
    {
      label: 'Opened',
      status: null,
      value: deliveryStats.read,
      pct: successful > 0 ? Math.round((deliveryStats.read / successful) * 100) : 0,
      icon: <IconEye size={16} className="text-blue-500" />,
      barColor: 'bg-blue-500',
      activeRing: '',
    },
    {
      label: 'Confirmed',
      status: null,
      value: rsvpStats.confirmed,
      pct: successful > 0 ? Math.round((rsvpStats.confirmed / successful) * 100) : 0,
      icon: <IconCircleCheck size={16} className="text-green-500" />,
      barColor: 'bg-green-500',
      activeRing: '',
    },
    {
      label: 'Declined',
      status: null,
      value: rsvpStats.declined,
      pct: successful > 0 ? Math.round((rsvpStats.declined / successful) * 100) : 0,
      icon: <IconCircleX size={16} className="text-red-500" />,
      barColor: 'bg-red-500',
      activeRing: '',
    },
  ];

  return (
    <div className="space-y-6">
      <StatsCards stats={stats} columns={4} />
      <RecentDeliveryActivity
        scheduleId={scheduleId}
        eventId={eventId}
      />
    </div>
  );
}
