import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { getDeliveryStats } from '../queries/message-deliveries';
import { getRsvpStats } from '../queries/guest-interactions';

interface SchedulePerformanceCardProps {
  scheduleId: string;
}

function formatPercentage(count: number, total: number): string {
  if (total === 0) return '';
  return `${Math.round((count / total) * 100)}%`;
}

function StatItem({
  label,
  count,
  total,
}: {
  label: string;
  count: number;
  total: number;
}) {
  const percentage = formatPercentage(count, total);

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-2xl font-semibold">
        {total === 0 ? '—' : count}
      </span>
      {total > 0 && (
        <span className="text-muted-foreground text-xs">
          {count}/{total} {percentage && `(${percentage})`}
        </span>
      )}
    </div>
  );
}

export async function SchedulePerformanceCard({
  scheduleId,
}: SchedulePerformanceCardProps) {
  const [deliveryStats, rsvpStats] = await Promise.all([
    getDeliveryStats(scheduleId),
    getRsvpStats(scheduleId),
  ]);

  const deliveredCount =
    deliveryStats.sent + deliveryStats.delivered + deliveryStats.read;

  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>Schedule Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-center">
          <StatItem
            label="Delivered"
            count={deliveredCount}
            total={deliveryStats.total}
          />
          <StatItem
            label="Confirmed"
            count={rsvpStats.confirmed}
            total={deliveredCount}
          />
          <StatItem
            label="Declined"
            count={rsvpStats.declined}
            total={deliveredCount}
          />
        </div>
      </CardContent>
    </Card>
  );
}
