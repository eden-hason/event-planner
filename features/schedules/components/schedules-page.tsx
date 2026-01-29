'use client';

import { useState, useActionState, startTransition, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Form } from '@/components/ui/form';
import {
  EventScheduleApp,
  UpdateScheduleSchema,
  UpdateSchedule,
  ScheduleActionState,
  ScheduleType,
} from '../schemas';
import { updateSchedule } from '../actions';
import { ScheduleDetails } from './schedule-details';
import { SchedulesHeader } from './schedules-header';

const SCHEDULE_TYPES: ScheduleType[] = [
  'invite',
  'followup',
  'reminder',
  'thankyou',
];

const TAB_LABELS: Record<ScheduleType, string> = {
  invite: 'Initial Invitation',
  followup: 'Follow-up Invitation',
  reminder: 'Event Reminder',
  thankyou: 'Thank You Note',
};

export function SchedulesPage({
  schedules,
  eventDate,
}: {
  schedules: EventScheduleApp[];
  eventDate?: string;
}) {
  const [activeTab, setActiveTab] = useState<ScheduleType>('invite');

  // Get the current schedule based on active tab
  const currentSchedule =
    schedules.find((schedule) => schedule.scheduleType === activeTab) ?? null;

  // Set up react-hook-form with zodResolver
  const form = useForm<UpdateSchedule>({
    resolver: zodResolver(UpdateScheduleSchema),
    defaultValues: currentSchedule
      ? {
          id: currentSchedule.id,
          scheduleType: currentSchedule.scheduleType,
          status: currentSchedule.status,
          triggerStrategy: currentSchedule.triggerStrategy,
          scheduledAt: currentSchedule.scheduledAt,
          offsetDays: currentSchedule.offsetDays,
          triggerTime: currentSchedule.triggerTime,
          messageBody: currentSchedule.messageBody,
          targetAudienceStatus: currentSchedule.targetAudienceStatus,
          channels: currentSchedule.channels,
        }
      : undefined,
  });

  const isDirty = form.formState.isDirty;

  // Reset form when active tab changes
  useEffect(() => {
    if (currentSchedule) {
      form.reset({
        id: currentSchedule.id,
        scheduleType: currentSchedule.scheduleType,
        status: currentSchedule.status,
        triggerStrategy: currentSchedule.triggerStrategy,
        scheduledAt: currentSchedule.scheduledAt,
        offsetDays: currentSchedule.offsetDays,
        triggerTime: currentSchedule.triggerTime,
        messageBody: currentSchedule.messageBody,
        targetAudienceStatus: currentSchedule.targetAudienceStatus,
        channels: currentSchedule.channels,
      });
    }
  }, [activeTab, currentSchedule, form]);

  // Server action state management
  const [, formAction, isPending] = useActionState(
    async (prevState: ScheduleActionState | null, formData: FormData) => {
      try {
        const result = await updateSchedule(formData);

        if (result.success) {
          toast.success(result.message);
          form.reset(form.getValues());
        } else {
          toast.error(result.message);
        }

        return result;
      } catch (error) {
        console.error('Form submission error:', error);
        return { success: false, message: 'An unexpected error occurred' };
      }
    },
    null,
  );

  // Handle form submission - convert form values to FormData
  const onSubmit = (values: UpdateSchedule) => {
    const formData = new FormData();

    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        // Stringify arrays for FormData
        if (Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else if (typeof value === 'object') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      }
    });

    startTransition(() => {
      formAction(formData);
    });
  };

  const handleDiscard = () => {
    form.reset();
  };

  const handleTabChange = (value: string) => {
    // Warn about unsaved changes before switching tabs
    if (isDirty) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to switch tabs?',
      );
      if (!confirmed) return;
    }
    setActiveTab(value as ScheduleType);
  };

  const formId = 'schedule-form';

  return (
    <Form {...form}>
      <form id={formId} onSubmit={form.handleSubmit(onSubmit)}>
        <SchedulesHeader
          formId={formId}
          isDirty={isDirty}
          isPending={isPending}
          onDiscard={handleDiscard}
        />

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="border-border mb-4 h-10 w-full justify-start gap-4 rounded-none border-b bg-transparent p-0">
            {SCHEDULE_TYPES.map((type) => (
              <TabsTrigger
                key={type}
                value={type}
                className="data-[state=active]:text-primary data-[state=active]:after:bg-primary relative h-full flex-none rounded-none border-none bg-transparent px-1 pb-3 shadow-none after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                {TAB_LABELS[type]}
              </TabsTrigger>
            ))}
          </TabsList>

          {SCHEDULE_TYPES.map((type) => (
            <TabsContent key={type} value={type}>
              <ScheduleDetails
                schedule={
                  schedules.find((s) => s.scheduleType === type) ?? null
                }
                eventDate={eventDate}
              />
            </TabsContent>
          ))}
        </Tabs>
      </form>
    </Form>
  );
}
