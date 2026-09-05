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
import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Item,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useFeatureLayoutContext } from '@/components/feature-layout/feature-layout-context';

import { type ScheduleTypeKey } from '../schemas';
import { type OutreachItem, type OutreachNavGroup } from '../types';
import { formatRelativeTime } from '../utils';

type ScheduleTypeIcon = React.ComponentType<{ size?: number | string; className?: string }>;

const ACTION_TYPE_ICONS: Record<ScheduleTypeKey, ScheduleTypeIcon> = {
  initial_invitation: IconMail,
  confirmation: IconUserCheck,
  event_reminder: IconBell,
  post_event: IconHeart,
  phone_call: IconPhone,
};

// Any schedule type outside the four known here (e.g. one added directly to
// the schedule_types table) falls back to a generic icon rather than crashing.
function getTypeIcon(type: string): ScheduleTypeIcon {
  return (ACTION_TYPE_ICONS as Partial<Record<string, ScheduleTypeIcon>>)[type] ?? IconCalendarEvent;
}

interface SchedulesLayoutProps {
  navGroups: OutreachNavGroup[];
  contentByType: Record<string, OutreachItem[]>;
}

export function SchedulesLayout({ navGroups, contentByType }: SchedulesLayoutProps) {
  const t = useTranslations('schedules');
  const [selectedType, setSelectedType] = useState<string>(
    () => navGroups[0]?.types[0] ?? '',
  );
  const [selectedSubIndex, setSelectedSubIndex] = useState(0);
  const { setHeader, clearHeader } = useFeatureLayoutContext();

  const activeItem =
    (contentByType[selectedType] ?? [])[selectedSubIndex] ??
    (contentByType[selectedType] ?? [])[0];

  useEffect(() => {
    setHeader({
      title: t('header.title'),
    });
    return () => clearHeader();
  }, [setHeader, clearHeader]);

  // Flattened once and shared by both navs: the sidebar and the mobile picker
  // are two renderings of the same list, so they must not drift apart.
  const groups = navGroups.map((group) => ({
    ...group,
    items: group.types.flatMap((type) =>
      (contentByType[type] ?? []).map((item, index) => ({ type, index, item })),
    ),
  }));

  // The picker needs a single scalar value, but an entry is identified by the
  // (type, index) pair - 'confirmation' can hold several schedules.
  const toValue = (type: string, index: number) => `${type}::${index}`;
  const selectValue = toValue(selectedType, selectedSubIndex);

  const handleSelect = (value: string) => {
    const separator = value.lastIndexOf('::');
    setSelectedType(value.slice(0, separator));
    setSelectedSubIndex(Number(value.slice(separator + 2)));
  };

  const ActiveIcon = getTypeIcon(selectedType);

  return (
    // Below md the sidebar would leave the content pane too narrow to read, so
    // the nav collapses into a picker above the content and the two panes stack.
    <div className="flex flex-col gap-4 md:flex-row md:gap-6">
      {/* Mobile nav - the same entries as the sidebar, in a picker */}
      <Select value={selectValue} onValueChange={handleSelect}>
        <SelectTrigger className="w-full md:hidden" aria-label={t('header.title')}>
          {/* One line only - the trigger clamps its value, so the status shows
              as a bare dot here and spells itself out in the open list. */}
          <SelectValue>
            <span className="flex w-full min-w-0 items-center gap-2">
              <ActiveIcon size={18} className="text-muted-foreground shrink-0" />
              <span className="truncate font-medium">{activeItem?.label}</span>
              {activeItem && <StatusDot status={activeItem.status} />}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {groups.map((group) => (
            <SelectGroup key={group.key}>
              <SelectLabel>{group.label}</SelectLabel>
              {group.items.map(({ type, index, item }) => {
                const Icon = getTypeIcon(type);

                return (
                  <SelectItem
                    key={`${type}-${index}`}
                    value={toValue(type, index)}
                    textValue={item.label}
                  >
                    <Icon size={18} className="text-muted-foreground shrink-0" />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate">{item.label}</span>
                      <StatusRow item={item} />
                    </span>
                  </SelectItem>
                );
              })}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>

      {/* Left vertical menu - one list per kind of outreach */}
      <nav
        aria-label={t('header.title')}
        className="hidden shrink-0 flex-col gap-6 md:flex md:w-52 lg:w-56"
      >
        {groups.map((group) => (
          <div key={group.key} className="flex flex-col gap-2">
            <div className="flex items-center gap-2 px-2">
              <h2 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                {group.label}
              </h2>
              <Badge variant="secondary" className="px-1.5 font-normal tabular-nums">
                {group.items.length}
              </Badge>
            </div>

            <ItemGroup className="gap-1">
              {group.items.map(({ type, index, item }) => {
                const Icon = getTypeIcon(type);
                const isActive = selectedType === type && selectedSubIndex === index;

                return (
                  <Item
                    key={`${type}-${index}`}
                    asChild
                    size="sm"
                    className={cn(
                      'w-full cursor-pointer text-start',
                      isActive
                        ? 'bg-background border-border shadow-xs'
                        : 'hover:bg-background/60',
                    )}
                  >
                    <button
                      type="button"
                      aria-current={isActive ? 'true' : undefined}
                      onClick={() => {
                        setSelectedType(type);
                        setSelectedSubIndex(index);
                      }}
                    >
                      <ItemMedia>
                        <Icon
                          size={18}
                          className={cn(
                            'shrink-0',
                            isActive ? 'text-foreground' : 'text-muted-foreground',
                          )}
                        />
                      </ItemMedia>
                      <ItemContent className="gap-0.5">
                        {/* Reuse the label already computed server-side (with the
                            known/unknown-type fallback baked in) instead of
                            recomputing it against the i18n catalog here. */}
                        <ItemTitle className="w-full truncate">{item.label}</ItemTitle>
                        <StatusRow item={item} />
                      </ItemContent>
                    </button>
                  </Item>
                );
              })}
            </ItemGroup>
          </div>
        ))}
      </nav>

      <Separator orientation="vertical" className="hidden h-auto self-stretch md:block" />

      {/* Right content */}
      <div className="min-w-0 flex-1">{activeItem?.details}</div>
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

function StatusDot({ status }: { status: OutreachItem['status'] }) {
  return (
    <span
      className={cn('inline-block size-1.5 shrink-0 rounded-full', STATUS_DOT[status])}
    />
  );
}

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
    // Carries the item-description slot so Item top-aligns the icon beside the
    // two-line label, the same way a real ItemDescription would.
    <span
      data-slot="item-description"
      className="text-muted-foreground flex items-center gap-1.5 text-xs"
    >
      <StatusDot status={item.status} />
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
