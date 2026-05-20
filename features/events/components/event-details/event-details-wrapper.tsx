'use client';

import { useTranslations } from 'next-intl';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { EventDetailsHeader } from './event-details-header';
import { DateTimeCard } from './date-time-card';
import { LocationCard } from './location-card';
import { CoupleCard } from './couple-card';
import { DigitalGiftCard } from './digital-gift-card';
import { GuestExperienceCard } from './guest-experience-card';
import { EventInvitationCard } from './event-invitation-card';
import { EventApp } from '../../schemas';

interface EventDetailsWrapperProps {
  event: EventApp;
}

export function EventDetailsWrapper({ event }: EventDetailsWrapperProps) {
  const t = useTranslations('eventDetails.statusAlert');

  const hasVenueLocation = !!event.location?.coords;
  const hasInvitationImage = !!event.invitations?.imageUrl;
  const allSet = hasVenueLocation && hasInvitationImage;

  const missingItems = [
    !hasVenueLocation && t('items.venueLocation'),
    !hasInvitationImage && t('items.invitationImage'),
  ].filter(Boolean) as string[];

  return (
    <div className="mx-auto max-w-3xl">
      <EventDetailsHeader />

      <div className="mb-4">
        {allSet ? (
          <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-medium">{t('success.title')}</p>
              <p className="text-xs opacity-80">{t('success.description')}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-medium">{t('warning.title')}</p>
              <p className="text-xs opacity-80">{t('warning.description')}</p>
              <ul className="mt-1 list-disc ps-4 text-xs opacity-80">
                {missingItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <DateTimeCard event={event} />
        <CoupleCard event={event} />
        <LocationCard event={event} />
        <EventInvitationCard
          eventId={event.id}
          imageUrl={event.invitations?.imageUrl}
        />
        <DigitalGiftCard event={event} />
        <GuestExperienceCard event={event} />
      </div>
    </div>
  );
}
