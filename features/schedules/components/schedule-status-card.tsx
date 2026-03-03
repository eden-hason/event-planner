import { IconActivity } from '@tabler/icons-react';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardAction,
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
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  cancelled: {
    description: 'This schedule has been cancelled.',
    label: 'Cancelled',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
};

const PENDING_CONFIG: StatusConfig = {
  description: 'Messages will be sent on the scheduled date.',
  label: 'Pending',
  className: 'bg-amber-100 text-amber-800 border-amber-200',
};

export function ScheduleStatusCard({ schedule }: ScheduleStatusCardProps) {
  const config = schedule.status ? STATUS_CONFIG[schedule.status] : PENDING_CONFIG;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="rounded-md bg-primary/10 p-1.5">
            <IconActivity size={16} className="text-primary" />
          </div>
          Status
        </CardTitle>
        <CardAction>
          <Badge variant="secondary" className={config.className}>
            {config.label}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">{config.description}</p>
      </CardContent>
    </Card>
  );
}
