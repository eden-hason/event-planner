'use client';

import { useState, useEffect } from 'react';
import {
  IconBell,
  IconCalendarEvent,
  IconHeart,
  IconMail,
  IconPhone,
  IconUserCheck,
} from '@tabler/icons-react';
import { useTranslations, useLocale } from 'next-intl';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useFeatureLayoutContext } from '@/components/feature-layout/feature-layout-context';

import { type ScheduleTypeKey } from '../schemas';
import { CALL_ROUNDS_NAV_KEY, type OutreachItem } from '../types';
import { formatRelativeTime } from '../utils';

type ScheduleTypeIcon = React.ComponentType<{ size?: number | string; className?: string }>;

const ACTION_TYPE_ICONS: Record<ScheduleTypeKey | typeof CALL_ROUNDS_NAV_KEY, ScheduleTypeIcon> = {
  initial_invitation: IconMail,
  confirmation: IconUserCheck,
  event_reminder: IconBell,
  post_event: IconHeart,
  [CALL_ROUNDS_NAV_KEY]: IconPhone,
};

// Any schedule type outside the four known here (e.g. one added directly to
// the schedule_types table) falls back to a generic icon rather than crashing.
function getTypeIcon(type: string): ScheduleTypeIcon {
  return (ACTION_TYPE_ICONS as Partial<Record<string, ScheduleTypeIcon>>)[type] ?? IconCalendarEvent;
}

interface SchedulesLayoutProps {
  visibleTypes: string[];
  contentByType: Record<string, OutreachItem[]>;
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

// A message schedule is done when it is 'sent'; a call round when it is
// 'completed'. Both read as a green dot - the distinction that matters in the
// nav is done / in flight / abandoned, not which kind produced it.
const STATUS_DOT: Record<OutreachItem['status'], string> = {
  sent: 'bg-green-500',
  completed: 'bg-green-500',
  pending: 'bg-amber-500',
  in_progress: 'bg-amber-500',
  cancelled: 'bg-muted-foreground/40',
};

const STATUS_LABEL_KEY: Record<OutreachItem['status'], string> = {
  sent: 'status.label.sent',
  completed: 'status.label.completed',
  pending: 'status.label.pending',
  in_progress: 'status.label.inProgress',
  cancelled: 'status.label.cancelled',
};

function StatusRow({ item }: { item: OutreachItem }) {
  const t = useTranslations('schedules');

  function formatTime(str: string): string {
    const result = formatRelativeTime(str);
    if (result.type === 'justNow') return t('relativeTime.justNow');
    const time = t(`relativeTime.units.${result.unit}`, { count: result.count });
    if (result.type === 'past') return t('relativeTime.past', { time });
    return t('relativeTime.future', { time });
  }

  return (
    <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
      <span className={cn('inline-block size-1.5 rounded-full', STATUS_DOT[item.status])} />
      {t(STATUS_LABEL_KEY[item.status] as 'status.label.sent')}
      {item.timestamp && (
        <>
          <span>·</span>
          {formatTime(item.timestamp)}
        </>
      )}
    </span>
  );
}
