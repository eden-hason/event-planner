'use client';

import { useState, useEffect } from 'react';
import {
  IconChartBar,
  IconCircleCheck,
  IconCircleCheckFilled,
  IconFileDescription,
} from '@tabler/icons-react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useFeatureLayoutContext } from '@/components/feature-layout/feature-layout-context';

import { ACTION_TYPE_LABELS, type ActionType } from '../schemas';
import { type ScheduleTabItem } from './schedules-page';
import { SendConfirmDialog } from './send-confirm-dialog';

interface SchedulesLayoutProps {
  visibleTypes: ActionType[];
  contentByType: Record<ActionType, ScheduleTabItem[]>;
}

const tabTriggerClassName =
  'data-[state=active]:text-primary data-[state=active]:after:bg-primary relative h-full flex-none rounded-none border-none bg-transparent px-1 pb-3 shadow-none after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none';

export function SchedulesLayout({
  visibleTypes,
  contentByType,
}: SchedulesLayoutProps) {
  const [selectedType, setSelectedType] = useState<ActionType>(visibleTypes[0]);
  const [selectedSubIndex, setSelectedSubIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('details');
  const { setHeader, clearHeader } = useFeatureLayoutContext();

  const handleTypeChange = (type: ActionType) => {
    setSelectedType(type);
    setSelectedSubIndex(0);
  };

  const activeItem =
    (contentByType[selectedType] ?? [])[selectedSubIndex] ??
    (contentByType[selectedType] ?? [])[0];
  const isPending = !activeItem?.scheduleStatus;
  const hasDeliveryTab = !!activeItem?.delivery;

  useEffect(() => {
    if (!hasDeliveryTab && activeTab === 'delivery') {
      setActiveTab('details');
    }
  }, [hasDeliveryTab, activeTab]);

  useEffect(() => {
    setHeader({
      title: 'Schedules',
      description: 'Manage your event schedule and timeline',
      action:
        isPending && activeItem?.scheduleId ? (
          <SendConfirmDialog
            scheduleId={activeItem.scheduleId}
            guestCount={activeItem.guestCount}
            targetStatus={activeItem.targetStatus}
            triggerSize="sm"
          />
        ) : undefined,
    });
    return () => clearHeader();
  }, [
    activeItem?.scheduleId,
    activeItem?.scheduleStatus,
    activeItem?.guestCount,
    activeItem?.targetStatus,
    setHeader,
    clearHeader,
  ]);

  return (
    <div className="flex gap-6">
      {/* Left vertical menu */}
      <nav className="flex w-52 shrink-0 flex-col gap-1">
        {visibleTypes.map((type) => {
          const typeItems = contentByType[type] ?? [];
          const hasMultiple = typeItems.length > 1;
          const isActive = selectedType === type;

          if (hasMultiple) {
            return typeItems.map((item, index) => (
              <Button
                key={`${type}-${index}`}
                variant="ghost"
                className={cn(
                  'justify-start',
                  isActive && selectedSubIndex === index
                    ? 'bg-background hover:bg-background'
                    : 'hover:bg-background/60',
                )}
                onClick={() => {
                  setSelectedType(type);
                  setSelectedSubIndex(index);
                }}
              >
                <span className="flex-1 text-left">{item.label}</span>
                {item.scheduleStatus === 'sent' ? (
                  <IconCircleCheckFilled size={15} className="text-green-500" />
                ) : (
                  <IconCircleCheck
                    size={15}
                    className="text-muted-foreground/40"
                  />
                )}
              </Button>
            ));
          }

          const singleItem = typeItems[0];
          return (
            <Button
              key={type}
              variant="ghost"
              className={cn(
                'justify-start',
                isActive
                  ? 'bg-background hover:bg-background'
                  : 'hover:bg-background/60',
              )}
              onClick={() => handleTypeChange(type)}
            >
              <span className="flex-1 text-left">
                {ACTION_TYPE_LABELS[type]}
              </span>
              {singleItem?.scheduleStatus === 'sent' ? (
                <IconCircleCheckFilled size={15} className="text-green-500" />
              ) : (
                <IconCircleCheck
                  size={15}
                  className="text-muted-foreground/40"
                />
              )}
            </Button>
          );
        })}
      </nav>

      {/* Right content with inner tabs */}
      <div className="min-w-0 flex-1">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="border-border mb-4 h-10 w-full justify-start gap-4 rounded-none border-b bg-transparent p-0">
            <TabsTrigger
              id="schedule-details-tab-trigger"
              value="details"
              className={tabTriggerClassName}
            >
              <IconFileDescription size={16} />
              Schedule Details
            </TabsTrigger>
            {hasDeliveryTab && (
              <TabsTrigger value="delivery" className={tabTriggerClassName}>
                <IconChartBar size={16} />
                Delivery Details
              </TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="details">{activeItem?.details}</TabsContent>
          {hasDeliveryTab && (
            <TabsContent value="delivery">{activeItem?.delivery}</TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
