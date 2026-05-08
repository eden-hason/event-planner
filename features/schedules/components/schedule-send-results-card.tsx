import { getTranslations } from 'next-intl/server';
import {
  IconBrandWhatsapp,
  IconChartBar,
  IconChartDots3,
  IconDeviceMobile,
} from '@tabler/icons-react';

import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { getDeliveryMethodStats } from '../queries/message-deliveries';
import type { ScheduleApp } from '../schemas';

interface ScheduleSendResultsCardProps {
  schedule: ScheduleApp;
}

function SegmentedBar({
  label,
  icon,
  segA,
  segB,
  total,
}: {
  label: string;
  icon: React.ReactNode;
  segA: { label: string; value: number; color: string };
  segB: { label: string; value: number; color: string };
  total: number;
}) {
  const pctA = total > 0 ? Math.round((segA.value / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          {icon}
          <span>{label}</span>
        </div>
        <span className="text-muted-foreground tabular-nums text-xs">
          {total.toLocaleString()}
        </span>
      </div>
      <div className="bg-muted flex h-2 w-full gap-0.5 overflow-hidden rounded-full">
        <div
          className={cn('h-full transition-all', segA.color)}
          style={{ width: `${pctA}%` }}
        />
        <div className={cn('h-full flex-1 transition-all', segB.color)} />
      </div>
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <div className={cn('h-2 w-2 shrink-0 rounded-sm', segA.color)} />
          <span>{segA.label}</span>
          <span className="text-foreground font-medium">
            {segA.value.toLocaleString()}
          </span>
        </div>
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <div className={cn('h-2 w-2 shrink-0 rounded-sm', segB.color)} />
          <span>{segB.label}</span>
          <span className="text-foreground font-medium">
            {segB.value.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

function SendResultsEmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <div className="bg-muted rounded-full p-3">
        <IconChartDots3 size={24} className="text-muted-foreground" strokeWidth={1.5} />
      </div>
      <p className="text-muted-foreground max-w-xs text-sm">{message}</p>
    </div>
  );
}

export async function ScheduleSendResultsCard({
  schedule,
}: ScheduleSendResultsCardProps) {
  const t = await getTranslations('schedules.sendResults');

  const isCancelled = schedule.status === 'cancelled';
  const stats = isCancelled ? null : await getDeliveryMethodStats(schedule.id);
  const hasData = stats !== null && stats.overall.total > 0;

  const bothChannels = hasData && stats.whatsapp.total > 0 && stats.sms.total > 0;

  const secondSection = !hasData ? null : bothChannels ? (
    <SegmentedBar
      label={t('byChannel')}
      icon={<IconBrandWhatsapp size={16} className="text-green-500" />}
      segA={{ label: t('whatsapp'), value: stats.whatsapp.total, color: 'bg-green-500' }}
      segB={{ label: t('sms'), value: stats.sms.total, color: 'bg-blue-400' }}
      total={stats.overall.total}
    />
  ) : stats.whatsapp.total > 0 ? (
    <SegmentedBar
      label={t('whatsapp')}
      icon={<IconBrandWhatsapp size={16} className="text-green-500" />}
      segA={{ label: t('success'), value: stats.whatsapp.successful, color: 'bg-teal-500' }}
      segB={{ label: t('failed'), value: stats.whatsapp.failed, color: 'bg-orange-500' }}
      total={stats.whatsapp.total}
    />
  ) : (
    <SegmentedBar
      label={t('sms')}
      icon={<IconDeviceMobile size={16} className="text-blue-400" />}
      segA={{ label: t('success'), value: stats.sms.successful, color: 'bg-teal-500' }}
      segB={{ label: t('failed'), value: stats.sms.failed, color: 'bg-orange-500' }}
      total={stats.sms.total}
    />
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="bg-primary/10 rounded-md p-1.5">
            <IconChartBar size={16} className="text-primary" />
          </div>
          {t('cardTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <SendResultsEmptyState message={isCancelled ? t('cancelledDescription') : t('emptyDescription')} />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <SegmentedBar
              label={t('byOutcome')}
              icon={<IconChartBar size={16} className="text-teal-500" />}
              segA={{ label: t('success'), value: stats.overall.successful, color: 'bg-teal-500' }}
              segB={{ label: t('failed'), value: stats.overall.failed, color: 'bg-orange-500' }}
              total={stats.overall.total}
            />
            {secondSection}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
