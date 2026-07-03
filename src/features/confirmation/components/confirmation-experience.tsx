'use client';

import { useEffect, useMemo } from 'react';
import { renderTemplate } from '@/features/templates/registry';
import {
  buildCoupleName,
  buildFormattedDate,
  buildTime,
  buildDishOptions,
} from '@/features/templates/utils';
import { submitConfirmation, recordViewInteraction } from '../actions';
import type { ConfirmationPageData } from '../schemas';

interface ConfirmationExperienceProps {
  token: string;
  data: ConfirmationPageData;
  templateId: string;
}

export function ConfirmationExperience({ token, data, templateId }: ConfirmationExperienceProps) {
  const { guest, event, scheduleId } = data;

  useEffect(() => {
    if (scheduleId) {
      recordViewInteraction(guest.id, scheduleId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formattedDate = useMemo(
    () => buildFormattedDate(event.eventDate),
    [event.eventDate],
  );

  const mapsLink = event.location?.coords
    ? `https://www.google.com/maps/search/?api=1&query=${event.location.coords.lat},${event.location.coords.lng}`
    : undefined;

  const hostDetails = event.hostDetails as
    | { bride?: { name?: string }; groom?: { name?: string } }
    | undefined;
  const coupleName = buildCoupleName(hostDetails, event.title);

  const dishOptions = useMemo(
    () => buildDishOptions(event.guestExperience),
    [event.guestExperience],
  );

  const time = buildTime(event.receptionTime, event.ceremonyTime);

  const handleSubmit = async (values: {
    rsvpStatus: 'confirmed' | 'declined';
    guestCount: number;
    mealChoice: string;
    notes: string;
  }) => {
    const formData = new FormData();
    formData.set('token', token);
    formData.set('rsvpStatus', values.rsvpStatus);
    if (values.rsvpStatus === 'confirmed') {
      formData.set('guestCount', String(values.guestCount));
      if (values.mealChoice) formData.set('mealChoice', values.mealChoice);
    }
    if (values.notes) formData.set('notes', values.notes);

    const result = await submitConfirmation(null, formData);
    return { success: result.success, message: result.message };
  };

  return renderTemplate(templateId, {
    coupleName,
    formattedDate,
    time,
    venue: event.location?.name,
    mapsLink,
    dishOptions,
    lockGuestCount: event.guestExperience?.lockGuestCount ?? false,
    guestName: guest.name,
    initialRsvpStatus: guest.rsvpStatus,
    initialAmount: guest.amount,
    initialMealChoice: guest.mealChoice ?? '',
    initialNotes: guest.notes ?? '',
    interactive: true,
    showConfetti: true,
    onSubmit: handleSubmit,
  });
}
