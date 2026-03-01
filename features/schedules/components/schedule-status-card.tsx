import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import type { ScheduleApp, ScheduleStatus } from '../schemas';

interface ScheduleStatusCardProps {
  schedule: ScheduleApp;
}

type StatusConfig = { description: string; label: string; className: string };

const STATUS_CONFIG: Record<ScheduleStatus, StatusConfig> = {
  sent: {
    description: 'Messages have been sent to eligible guests.',
    label: 'Sent',
    className: 'bg-blue-100 text-blue-700',
  },
  cancelled: {
    description: 'This schedule has been cancelled.',
    label: 'Cancelled',
    className: 'bg-red-100 text-red-700',
  },
};

const PENDING_CONFIG: StatusConfig = {
  description: 'Messages will be sent on the scheduled date.',
  label: 'Pending',
  className: 'bg-amber-100 text-amber-700',
};

export function ScheduleStatusCard({ schedule }: ScheduleStatusCardProps) {
  const config = schedule.status ? STATUS_CONFIG[schedule.status] : PENDING_CONFIG;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Schedule Status</span>
          <span
            className={`rounded-sm px-2 py-0.5 text-xs font-medium ${config.className}`}
          >
            {config.label}
          </span>
        </div>
        <p className="text-muted-foreground text-sm">{config.description}</p>
      </CardContent>
    </Card>
  );
}
