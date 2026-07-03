'use client';

import { useTranslations } from 'next-intl';
import { IconClock } from '@tabler/icons-react';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { type ActionType } from '../../schemas';

export type TimelineRow = {
  key: string;
  templateKey: string;
  actionType: ActionType;
  targetStatus: 'pending' | 'confirmed' | null;
  enabled: boolean;
  date: Date;
  time: string;
  deliveryMethod: 'whatsapp' | 'sms';
};

interface WizardTimelineStepProps {
  rows: TimelineRow[];
  onRowsChange: (rows: TimelineRow[]) => void;
  targetCounts: { all: number; pending: number; confirmed: number };
  eventDate?: string;
}

const AUDIENCE_KEY: Record<'pending' | 'confirmed' | 'all', string> = {
  pending: 'audience.pendingGuests',
  confirmed: 'audience.confirmedGuests',
  all: 'audience.allGuests',
};

const AUDIENCE_DOT_CLASS: Record<'pending' | 'confirmed' | 'all', string> = {
  pending: 'bg-yellow-400',
  confirmed: 'bg-green-500',
  all: 'bg-blue-400',
};

function getDayOffset(rowDate: Date, eventDate: string): number {
  const event = new Date(eventDate);
  event.setHours(0, 0, 0, 0);
  const row = new Date(rowDate);
  row.setHours(0, 0, 0, 0);
  return Math.round((row.getTime() - event.getTime()) / (1000 * 60 * 60 * 24));
}

type TFunction = ReturnType<typeof useTranslations<'schedules'>>;

function DayOffsetLabel({ date, eventDate, t }: { date: Date; eventDate: string; t: TFunction }) {
  const diff = getDayOffset(date, eventDate);
  return (
    <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
      <Badge variant="secondary" className="gap-1 rounded-sm text-xs">
        {Math.abs(diff) === 0 ? '0' : Math.abs(diff)}
      </Badge>
      {diff === 0
        ? t('dayOffset.onEventDay')
        : diff < 0
          ? t('dayOffset.daysBefore')
          : t('dayOffset.daysAfter')}
    </p>
  );
}

export function WizardTimelineStep({
  rows,
  onRowsChange,
  eventDate,
}: WizardTimelineStepProps) {
  const t = useTranslations('schedules');

  const updateRow = (key: string, patch: Partial<TimelineRow>) => {
    onRowsChange(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const actionTypeTotals = rows.reduce<Partial<Record<ActionType, number>>>(
    (acc, r) => ({ ...acc, [r.actionType]: (acc[r.actionType] ?? 0) + 1 }),
    {},
  );
  const actionTypeCounters: Partial<Record<ActionType, number>> = {};

  const timelineItems = rows.map((row) => {
    actionTypeCounters[row.actionType] = (actionTypeCounters[row.actionType] ?? 0) + 1;
    const total = actionTypeTotals[row.actionType] ?? 1;
    const index = actionTypeCounters[row.actionType]!;
    const label =
      total > 1
        ? `${t(`actionTypes.${row.actionType}`)} ${index}/${total}`
        : t(`actionTypes.${row.actionType}`);
    const audienceKind = row.targetStatus ?? 'all';

    return (
      <div
        key={row.key}
        className={cn(
          'rounded-lg border p-4 transition-colors',
          row.enabled ? 'bg-card' : 'bg-muted/40',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">{label}</p>
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              {t('audience.sentTo')}
              <Badge variant="secondary" className="gap-1.5 rounded-sm text-xs">
                <span className={cn('size-1.5 rounded-full', AUDIENCE_DOT_CLASS[audienceKind])} />
                {t(AUDIENCE_KEY[audienceKind])}
              </Badge>
            </p>
          </div>
          <Switch
            checked={row.enabled}
            onCheckedChange={(checked) => updateRow(row.key, { enabled: checked })}
          />
        </div>

        {row.enabled && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <p className="text-muted-foreground text-xs">{t('setupWizard.sendDateLabel')}</p>
              <DatePicker
                date={row.date}
                onDateChange={(date) => date && updateRow(row.key, { date })}
              />
              {eventDate && <DayOffsetLabel date={row.date} eventDate={eventDate} t={t} />}
            </div>
            <div className="space-y-1.5">
              <p className="text-muted-foreground text-xs">{t('setupWizard.timeLabel')}</p>
              <Select
                value={row.time}
                onValueChange={(time) => updateRow(row.key, { time })}
              >
                <SelectTrigger className="w-full">
                  <IconClock size={16} className="text-muted-foreground shrink-0" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10:00">10:00</SelectItem>
                  <SelectItem value="14:00">14:00</SelectItem>
                  <SelectItem value="18:00">18:00</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
    );
  });

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        {t('setupWizard.timelineHelper')}
      </p>
      <div className="space-y-3">{timelineItems}</div>
    </div>
  );
}
