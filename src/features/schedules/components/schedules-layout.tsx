'use client';

import { useState, useEffect } from 'react';
import {
  IconBell,
  IconCalendarEvent,
  IconHeart,
  IconMail,
  IconUserCheck,
} from '@tabler/icons-react';
import { useTranslations, useLocale } from 'next-intl';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useFeatureLayoutContext } from '@/components/feature-layout/feature-layout-context';

import { type ScheduleTypeKey } from '../schemas';
import { formatRelativeTime } from '../utils';
import { type ScheduleTabItem } from './schedules-page';

type ScheduleTypeIcon = React.ComponentType<{ size?: number | string; className?: string }>;

const ACTION_TYPE_ICONS: Record<ScheduleTypeKey, ScheduleTypeIcon> = {
  initial_invitation: IconMail,
  confirmation: IconUserCheck,
  event_reminder: IconBell,
  post_event: IconHeart,
};

// Any schedule type outside the four known here (e.g. one added directly to
// the schedule_types table) falls back to a generic icon rather than crashing.
function getTypeIcon(type: string): ScheduleTypeIcon {
  return (ACTION_TYPE_ICONS as Partial<Record<string, ScheduleTypeIcon>>)[type] ?? IconCalendarEvent;
}

interface SchedulesLayoutProps {
  visibleTypes: string[];
  contentByType: Record<string, ScheduleTabItem[]>;
}

export function SchedulesLayout({
  visibleTypes,
  contentByType,
}: SchedulesLayoutProps) {
  const t = useTranslations('schedules');
  const [selectedType, setSelectedType] = useState<string>(visibleTypes[0]);
  const [selectedSubIndex, setSelectedSubIndex] = useState(0);
  const { setHeader, clearHeader } = useFeatureLayoutContext();

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    setSelectedSubIndex(0);
  };

  const activeItem =
    (contentByType[selectedType] ?? [])[selectedSubIndex] ??
    (contentByType[selectedType] ?? [])[0];

  useEffect(() => {
    setHeader({
      title: t('header.title'),
      description: t('header.description'),
    });
    return () => clearHeader();
  }, [setHeader, clearHeader]);

  return (
    <div className="flex gap-6">
      {/* Left vertical menu */}
      <nav className="flex w-52 shrink-0 flex-col gap-1">
        {visibleTypes.flatMap((type) => {
          const typeItems = contentByType[type] ?? [];
          const hasMultiple = typeItems.length > 1;
          const isActive = selectedType === type;

          if (hasMultiple) {
            const Icon = getTypeIcon(type);
            return typeItems.map((item, index) => (
              <Button
                key={`${type}-${index}`}
                variant="ghost"
                className={cn(
                  'h-auto justify-start py-2',
                  isActive && selectedSubIndex === index
                    ? 'bg-background hover:bg-background'
                    : 'hover:bg-background/60',
                )}
                onClick={() => {
                  setSelectedType(type);
                  setSelectedSubIndex(index);
                }}
              >
                <div className="flex flex-1 items-start gap-2">
                  <Icon size={18} className="text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex flex-1 flex-col items-start gap-0.5">
                    <span>{item.label}</span>
                    <StatusRow item={item} />
                  </div>
                </div>
              </Button>
            ));
          }

          const Icon = getTypeIcon(type);
          return [
            <Button
              key={type}
              variant="ghost"
              className={cn(
                'h-auto justify-start py-2',
                isActive
                  ? 'bg-background hover:bg-background'
                  : 'hover:bg-background/60',
              )}
              onClick={() => handleTypeChange(type)}
            >
              <div className="flex flex-1 items-start gap-2">
                <Icon size={18} className="text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex flex-1 flex-col items-start gap-0.5">
                  {/* Reuse the label already computed server-side (with the
                      known/unknown-type fallback baked in) instead of
                      recomputing it against the i18n catalog here. */}
                  <span>{typeItems[0]?.label ?? type}</span>
                  {typeItems[0] && <StatusRow item={typeItems[0]} />}
                </div>
              </div>
            </Button>,
          ];
        })}
      </nav>

      {/* Right content */}
      <div className="min-w-0 flex-1">
        {activeItem?.details}
      </div>
    </div>
  );
}

function StatusRow({ item }: { item: ScheduleTabItem }) {
  const t = useTranslations('schedules');
  const isSent = item.scheduleStatus === 'sent';
  const isCancelled = item.scheduleStatus === 'cancelled';
  const dateStr = isSent ? item.sentAt : isCancelled ? undefined : item.scheduledDate;

  function formatTime(str: string): string {
    const result = formatRelativeTime(str);
    if (result.type === 'justNow') return t('relativeTime.justNow');
    const time = t(`relativeTime.units.${result.unit}`, { count: result.count });
    if (result.type === 'past') return t('relativeTime.past', { time });
    return t('relativeTime.future', { time });
  }

  return (
    <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
      <span
        className={cn(
          'inline-block size-1.5 rounded-full',
          isSent ? 'bg-green-500' : isCancelled ? 'bg-muted-foreground/40' : 'bg-amber-500',
        )}
      />
      {isSent
        ? t('status.label.sent')
        : isCancelled
          ? t('status.label.cancelled')
          : t('status.label.pending')}
      {dateStr && (
        <>
          <span>·</span>
          {formatTime(dateStr)}
        </>
      )}
    </span>
  );
}
