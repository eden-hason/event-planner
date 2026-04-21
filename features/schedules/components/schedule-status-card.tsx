import { getTranslations } from 'next-intl/server';
import { IconActivity } from '@tabler/icons-react';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import type { ScheduleApp } from '../schemas';

interface ScheduleStatusCardProps {
  schedule: ScheduleApp;
}

const STATUS_CLASS = {
  sent: 'bg-blue-100 text-blue-800 border-blue-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
} as const;

export async function ScheduleStatusCard({ schedule }: ScheduleStatusCardProps) {
  const t = await getTranslations('schedules');
  const key = schedule.status ?? 'pending';
  const className = STATUS_CLASS[key];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="rounded-md bg-primary/10 p-1.5">
            <IconActivity size={16} className="text-primary" />
          </div>
          {t('status.cardTitle')}
        </CardTitle>
        <CardAction>
          <Badge variant="secondary" className={className}>
            {t(`status.label.${key}`)}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">{t(`status.description.${key}`)}</p>
      </CardContent>
    </Card>
  );
}
