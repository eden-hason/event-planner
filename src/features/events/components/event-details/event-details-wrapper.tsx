'use client';

import { useTranslations } from 'next-intl';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
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
          <Alert variant="success">
            <CheckCircle2 />
            <AlertTitle>{t('success.title')}</AlertTitle>
            <AlertDescription>{t('success.description')}</AlertDescription>
          </Alert>
        ) : (
          <Alert variant="warning">
            <AlertTriangle />
            <AlertTitle>{t('warning.title')}</AlertTitle>
            <AlertDescription>
              {t('warning.description')}
              <ul className="mt-1 list-disc ps-4">
                {missingItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
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
