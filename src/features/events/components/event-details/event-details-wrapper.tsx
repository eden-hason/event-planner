'use client';

import * as React from 'react';
import { useForm, type FieldPath } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Form } from '@/components/ui/form';
import { useFeatureHeader } from '@/components/feature-layout';
import { buildNavUrl } from '@/components/layout/nav-urls';
import {
  EventDetailsFormSchema,
  isCoupleEvent,
  type EventApp,
  type EventDetailsFormValues,
  type EventTypeKey,
} from '../../schemas';
import { updateEventDetails } from '../../actions';
import {
  buildDefaultValues,
  buildUpdateFields,
  changedKeys,
  missingReadinessItems,
  type ChangeKey,
} from '../../utils/event-details-form';
import {
  EventDetailsProvider,
  type DateChangeImpact,
} from './event-details-context';
import { ReadinessSummary } from './readiness-summary';
import { HostsSection } from './hosts-section';
import { DateTimeSection } from './date-time-section';
import { LocationSection } from './location-section';
import { InvitationSection } from './invitation-section';
import { GuestExperienceSection } from './guest-experience-section';
import { SaveBar } from './save-bar';

/**
 * Where each named change lives in the form, so one can be saved or rolled back
 * on its own. `resetField` needs a leaf, not a section.
 */
const FIELD_PATHS: Record<ChangeKey, FieldPath<EventDetailsFormValues>> = {
  eventDate: 'eventDate',
  receptionTime: 'receptionTime',
  ceremonyTime: 'ceremonyTime',
  location: 'location',
  invitation: 'invitations.imageUrl',
  brideName: 'hostDetails.bride.name',
  brideParents: 'hostDetails.bride.parents',
  groomName: 'hostDetails.groom.name',
  groomParents: 'hostDetails.groom.parents',
  childName: 'hostDetails.child.name',
  childParents: 'hostDetails.child.parents',
  specialMeal: 'guestExperience.dietaryOptions',
  meals: 'guestExperience.dietaryTypes',
  lockGuestCount: 'guestExperience.lockGuestCount',
  sendTableNumbers: 'guestExperience.sendTableNumbers',
};

interface EventDetailsWrapperProps {
  event: EventApp;
  /**
   * How much of the outreach plan is still pointed at the stored date. Fetched
   * on the server because the warning is only worth showing when there is a plan
   * to strand - see docs/backlog/0008.
   */
  plan: DateChangeImpact;
}

/**
 * The Event details page: everything a Guest will be told, on one page with one
 * save.
 *
 * Three questions, in the order an Owner asks them - who the Event is for, what
 * is still missing before the first message, and what Guests get asked - rather
 * than one card per database column. Readiness is stated once at the top instead
 * of beside every field, and the whole page shares a single form so a sitting
 * that touches three sections is still one save.
 */
export function EventDetailsWrapper({ event, plan }: EventDetailsWrapperProps) {
  const t = useTranslations('eventDetails');
  const tToast = useTranslations('eventDetails.toast');

  const eventType = event.eventType as EventTypeKey | undefined;
  // An event whose type is somehow unset is treated as a couple event, the shape
  // the onboarding names screen defaults to.
  const couple = !eventType || isCoupleEvent(eventType);
  const female = eventType === 'bat_mitzva';
  const hasCeremony = eventType === 'wedding';

  const typeLabel = eventType ? t(`types.${eventType}`) : null;

  const form = useForm<EventDetailsFormValues>({
    resolver: zodResolver(EventDetailsFormSchema),
    defaultValues: buildDefaultValues(event),
  });

  const [isSaving, setIsSaving] = React.useState(false);

  const changes = changedKeys(form.formState.dirtyFields, {
    couple,
    hasCeremony,
  });

  const liveLocation = form.watch('location');
  const liveImageUrl = form.watch('invitations.imageUrl');
  const missing = missingReadinessItems({
    location: liveLocation ?? undefined,
    invitations: { imageUrl: liveImageUrl },
  });

  useFeatureHeader({
    title: t('header.title'),
    subtitle: t('header.subtitle'),
    action: typeLabel ? (
      <Badge variant="secondary" className="rounded-full">
        {typeLabel}
      </Badge>
    ) : undefined,
  });

  const save = React.useCallback(
    async (keys: readonly ChangeKey[]): Promise<boolean> => {
      if (keys.length === 0) return true;

      const values = form.getValues();
      const fields = buildUpdateFields(values, keys, { couple });
      const formData = new FormData();
      Object.entries(fields).forEach(([key, value]) =>
        formData.append(key, value),
      );

      setIsSaving(true);
      try {
        const result = await updateEventDetails(formData);
        if (!result.success) {
          toast.error(result.message || tToast('error'));
          return false;
        }

        // Only the saved fields are settled. Resetting the whole form would
        // quietly drop a change the Owner made elsewhere and had not saved yet.
        keys.forEach((key) => {
          const path = FIELD_PATHS[key];
          form.resetField(path, {
            defaultValue: form.getValues(path),
          });
        });
        toast.success(tToast('saved'));
        return true;
      } catch {
        toast.error(tToast('error'));
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [couple, form, tToast],
  );

  const revert = React.useCallback(
    (keys: readonly ChangeKey[]) => {
      keys.forEach((key) => form.resetField(FIELD_PATHS[key]));
    },
    [form],
  );

  const focusSection = React.useCallback((id: string) => {
    const section = document.getElementById(id);
    if (!section) return;

    section.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const marker = section.querySelector<HTMLElement>('[data-readiness-focus]');
    if (!marker) return;
    const control = marker.matches('input, button, [tabindex]')
      ? marker
      : marker.querySelector<HTMLElement>('input, button, [tabindex]');
    control?.focus({ preventScroll: true });
  }, []);

  const context = React.useMemo(
    () => ({
      eventId: event.id,
      eventType,
      couple,
      female,
      hasCeremony,
      savedEventDate: event.eventDate,
      plan,
      schedulesHref: buildNavUrl('/app/schedules', event.id),
      isSaving,
      save,
      revert,
      focusSection,
    }),
    [
      couple,
      event.eventDate,
      event.id,
      eventType,
      female,
      focusSection,
      hasCeremony,
      isSaving,
      plan,
      revert,
      save,
    ],
  );

  return (
    <EventDetailsProvider value={context}>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(() => {
            void save(changes);
          })}
          className="flex flex-col gap-3.5 lg:gap-[18px]"
        >
          {/*
            The width cap is on the content, not the form, so the save bar below
            can still run the full width of the page.
          */}
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-3.5 lg:gap-[18px]">
            <ReadinessSummary missing={missing} />

            {/* The hero: who the Event is for, across both columns. */}
            <HostsSection />

            {/*
            Two columns from `lg`: the things that describe the Event on one side,
            the invitation image beside them. On a phone it is one stack, with the
            invitation between the venue and the questions.
          */}
            <div className="grid items-start gap-3.5 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-x-[18px] lg:gap-y-[18px]">
              <div className="lg:col-start-1">
                <DateTimeSection />
              </div>
              <div className="lg:col-start-1">
                <LocationSection />
              </div>
              <div className="lg:col-start-2 lg:row-span-3 lg:row-start-1">
                <InvitationSection />
              </div>
              <div className="lg:col-start-1">
                <GuestExperienceSection />
              </div>
            </div>
          </div>

          <SaveBar
            changes={changes}
            female={female}
            onCancel={() => revert(changes)}
            isSaving={isSaving}
          />
        </form>
      </Form>
    </EventDetailsProvider>
  );
}
