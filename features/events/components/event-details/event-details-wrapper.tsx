'use client';

import { useActionState, startTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Form } from '@/components/ui/form';
import { EventDetailsHeader } from './event-details-header';
import { LogisticsCard } from './logistics-card';
import { CoupleCard } from './couple-card';
import { DigitalGiftCard } from './digital-gift-card';
import { EventInvitationCard } from './event-invitation-card';
import {
  EventApp,
  EventDetailsUpdateSchema,
  EventDetailsUpdate,
  UpdateEventDetailsState,
  WeddingHostDetails,
} from '../../schemas';
import { updateEventDetails } from '../../actions';

interface EventDetailsWrapperProps {
  event: EventApp;
}

export function EventDetailsWrapper({ event }: EventDetailsWrapperProps) {
  // Cast hostDetails to WeddingHostDetails for type safety
  const hostDetails = event.hostDetails as WeddingHostDetails | undefined;

  // Set up react-hook-form with zodResolver
  const form = useForm<EventDetailsUpdate>({
    resolver: zodResolver(EventDetailsUpdateSchema),
    defaultValues: {
      id: event.id,
      eventDate: event.eventDate || '',
      eventType: event.eventType || '',
      receptionTime: event.receptionTime || '',
      ceremonyTime: event.ceremonyTime || '',
      location: event.location || undefined,
      hostDetails: {
        bride: {
          name: hostDetails?.bride?.name || '',
          parents: hostDetails?.bride?.parents || '',
        },
        groom: {
          name: hostDetails?.groom?.name || '',
          parents: hostDetails?.groom?.parents || '',
        },
      },
      eventSettings: {
        payboxConfig: {
          enabled: event.eventSettings?.payboxConfig?.enabled || false,
          link: event.eventSettings?.payboxConfig?.link || '',
        },
        bitConfig: {
          enabled: event.eventSettings?.bitConfig?.enabled || false,
          phoneNumber: event.eventSettings?.bitConfig?.phoneNumber || '',
        },
      },
      invitations: {
        frontImageUrl: event.invitations?.frontImageUrl || undefined,
        backImageUrl: event.invitations?.backImageUrl || undefined,
      },
    },
  });

  const isDirty = form.formState.isDirty;

  // Server action state management
  const [, formAction, isPending] = useActionState(
    async (prevState: UpdateEventDetailsState | null, formData: FormData) => {
      try {
        const result = await updateEventDetails(formData);

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
  const onSubmit = (values: EventDetailsUpdate) => {
    const formData = new FormData();

    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        // Stringify objects (hostDetails, eventSettings) for FormData
        if (typeof value === 'object') {
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

  const formId = 'event-details-form';

  return (
    <Form {...form}>
      <form id={formId} onSubmit={form.handleSubmit(onSubmit)}>
        <EventDetailsHeader
          formId={formId}
          isDirty={isDirty}
          isPending={isPending}
          onDiscard={handleDiscard}
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Row 1 */}
          <div className="lg:col-span-7">
            <LogisticsCard />
          </div>
          <div className="h-full lg:col-span-5">
            <CoupleCard />
          </div>

          {/* Row 2 */}
          <div className="lg:col-span-5">
            <DigitalGiftCard />
          </div>
          <div className="lg:col-span-7">
            <EventInvitationCard
              eventId={event.id}
              frontImageUrl={event.invitations?.frontImageUrl}
              backImageUrl={event.invitations?.backImageUrl}
            />
          </div>
        </div>
      </form>
    </Form>
  );
}
