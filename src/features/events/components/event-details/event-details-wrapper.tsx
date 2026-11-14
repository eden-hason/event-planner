'use client';

import * as React from 'react';
import { useForm, type FieldPath } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Form } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { useFeatureHeader } from '@/components/feature-layout';
import { buildNavUrl } from '@/components/layout/nav-urls';
import {
  followUpAttachment,
  updateMessageMedia,
  type MessageMediaState,
} from '@/features/schedules';
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
  MEDIA_CHANGE_KEYS,
  type ChangeKey,
} from '../../utils/event-details-form';
import {
  EventDetailsProvider,
  type DateChangeImpact,
} from './event-details-context';
import { HostsSection } from './hosts-section';
import { DateTimeSection } from './date-time-section';
import { LocationSection } from './location-section';
import { InvitationSection } from './invitation-section';
import { MediaSection } from './media-section';
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
  invitationVideo: 'invitationVideoUrl',
  invitationMedia: 'messageMedia.invitation',
  followUpMedia: 'messageMedia.followUps',
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
  askTransportation: 'guestExperience.askTransportation',
};

interface EventDetailsWrapperProps {
  event: EventApp;
  /**
   * How much of the outreach plan is still pointed at the stored date. Fetched
   * on the server because the warning is only worth showing when there is a plan
   * to strand - see docs/backlog/0008.
   */
  plan: DateChangeImpact;
  /**
   * What the Asks attach, on the current Message Plan; null on a Classic
   * Event, which keeps the invitation image section instead.
   */
  media: MessageMediaState | null;
}

/** Why a media save was refused, as the toast names it. */
function mediaErrorKey(code: string | undefined): string {
  if (code === 'attachment_unavailable' || code === 'attachment_not_offered') return 'mediaMissingFile';
  if (code === 'not_editable') return 'mediaSent';
  return 'mediaFailed';
}

/**
 * The Event details page: everything a Guest will be told, on one page with one
 * save.
 *
 * Three questions, in the order an Owner asks them - who the Event is for, when
 * and where it happens, and what Guests get asked - rather than one card per
 * database column. The whole page shares a single form so a sitting that touches
 * three sections is still one save.
 */
export function EventDetailsWrapper({ event, plan, media }: EventDetailsWrapperProps) {
  const t = useTranslations('eventDetails');
  const tToast = useTranslations('eventDetails.toast');

  const eventType = event.eventType as EventTypeKey | undefined;
  // An event whose type is somehow unset is treated as a couple event, the shape
  // the onboarding names screen defaults to.
  const couple = !eventType || isCoupleEvent(eventType);
  const female = eventType === 'bat_mitzva';
  const hasCeremony = eventType === 'wedding';

  const form = useForm<EventDetailsFormValues>({
    resolver: zodResolver(EventDetailsFormSchema),
    defaultValues: buildDefaultValues(event, media),
  });

  const [isSaving, setIsSaving] = React.useState(false);

  const changes = changedKeys(form.formState.dirtyFields, {
    couple,
    hasCeremony,
  });

  useFeatureHeader({
    title: t('header.title'),
    subtitle: t('header.subtitle'),
  });

  // Settles the saved fields only. Resetting the whole form would quietly drop
  // a change the Owner made elsewhere and had not saved yet.
  const settle = React.useCallback(
    (keys: readonly ChangeKey[]) => {
      keys.forEach((key) => {
        const path = FIELD_PATHS[key];
        form.resetField(path, { defaultValue: form.getValues(path) });
      });
    },
    [form],
  );

  // The Event row first: a newly uploaded image or video has to be stored
  // before an attachment that needs it can be saved.
  const saveEvent = React.useCallback(
    async (keys: readonly ChangeKey[]): Promise<boolean> => {
      if (keys.length === 0) return true;
      const fields = buildUpdateFields(form.getValues(), keys, { couple });
      const formData = new FormData();
      Object.entries(fields).forEach(([key, value]) => formData.append(key, value));
      const result = await updateEventDetails(formData);
      if (!result.success) {
        toast.error(result.message || tToast('error'));
        return false;
      }
      settle(keys);
      return true;
    },
    [couple, form, settle, tToast],
  );

  // The Asks' attachments live on the Schedules (current plan only).
  const saveMedia = React.useCallback(
    async (keys: readonly ChangeKey[]): Promise<boolean> => {
      if (keys.length === 0 || !media) return true;
      const values = form.getValues();
      const choice = values.messageMedia.invitation;
      if (choice === 'image' && !values.invitations.imageUrl) {
        toast.error(tToast('mediaMissingImage'));
        return false;
      }
      if (choice === 'video' && !values.invitationVideoUrl) {
        toast.error(tToast('mediaMissingVideo'));
        return false;
      }
      if (
        keys.includes('followUpMedia') &&
        values.messageMedia.followUps &&
        media.followUps.editableIds.length > 0 &&
        !values.invitations.imageUrl
      ) {
        toast.error(tToast('mediaMissingFollowUpImage'));
        return false;
      }
      const result = await updateMessageMedia({
        invitation:
          keys.includes('invitationMedia') && media.invitation?.editable
            ? { scheduleId: media.invitation.scheduleId, attachment: choice }
            : undefined,
        followUps: keys.includes('followUpMedia')
          ? {
            scheduleIds: media.followUps.editableIds,
            attachment: followUpAttachment(values.messageMedia.followUps),
          }
          : undefined,
      });
      if (!result.success) {
        toast.error(tToast(mediaErrorKey(result.code)));
        return false;
      }
      settle(keys);
      return true;
    },
    [form, media, settle, tToast],
  );

  const save = React.useCallback(
    async (keys: readonly ChangeKey[]): Promise<boolean> => {
      if (keys.length === 0) return true;
      setIsSaving(true);
      try {
        const saved =
          (await saveEvent(keys.filter((key) => !MEDIA_CHANGE_KEYS.has(key)))) &&
          (await saveMedia(keys.filter((key) => MEDIA_CHANGE_KEYS.has(key))));
        if (saved) toast.success(tToast('saved'));
        return saved;
      } catch {
        toast.error(tToast('error'));
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [saveEvent, saveMedia, tToast],
  );

  const revert = React.useCallback(
    (keys: readonly ChangeKey[]) => {
      keys.forEach((key) => form.resetField(FIELD_PATHS[key]));
    },
    [form],
  );

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
      media,
      isSaving,
      save,
      revert,
    }),
    [
      couple,
      event.eventDate,
      event.id,
      eventType,
      female,
      hasCeremony,
      isSaving,
      media,
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
            {/* The hero: who the Event is for, across both columns. */}
            <HostsSection />

            {/*
            Two columns from `lg`: the things that describe the Event on one side,
            the invitation image beside them. On a phone it is one stack, with the
            invitation between the venue and the questions.
          */}
            <div
              className={cn(
                'grid items-start gap-3.5 lg:gap-x-[18px] lg:gap-y-[18px]',
                // The media card holds two stages, so it gets a wider column.
                media
                  ? 'lg:grid-cols-[minmax(0,1fr)_380px]'
                  : 'lg:grid-cols-[minmax(0,1fr)_300px]',
              )}
            >
              <div className="lg:col-start-1">
                <DateTimeSection />
              </div>
              <div className="lg:col-start-1">
                <LocationSection />
              </div>
              <div className="lg:col-start-2 lg:row-span-3 lg:row-start-1">
                {media ? <MediaSection /> : <InvitationSection />}
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
