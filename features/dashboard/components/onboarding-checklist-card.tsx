'use client';

import { useTranslations } from 'next-intl';
import { Onboarding } from '@/components/onboarding';
import type { OnboardingStatus } from '@/features/dashboard/types';

export function OnboardingChecklistCard({
  eventId,
  status,
}: {
  eventId: string;
  status: OnboardingStatus;
}) {
  const t = useTranslations('dashboard.onboarding');

  const steps = [
    {
      id: 'details',
      title: t('details.title'),
      description: t('details.description'),
      completed: status.detailsComplete,
      actionLabel: t('details.action'),
      actionHref: `/app/${eventId}/details`,
    },
    {
      id: 'guests',
      title: t('guests.title'),
      description: t('guests.description'),
      completed: status.hasGuests,
      actionLabel: t('guests.action'),
      actionHref: `/app/${eventId}/guests`,
    },
    {
      id: 'groups',
      title: t('groups.title'),
      description: t('groups.description'),
      completed: status.hasGroups,
      actionLabel: t('groups.action'),
      actionHref: `/app/${eventId}/guests`,
    },
    {
      id: 'invitation',
      title: t('invitation.title'),
      description: t('invitation.description'),
      completed: status.hasInvitationImage,
      actionLabel: t('invitation.action'),
      actionHref: `/app/${eventId}/details`,
    },
    {
      id: 'collaborator',
      title: t('collaborator.title'),
      description: t('collaborator.description'),
      completed: status.hasCollaborator,
      actionLabel: t('collaborator.action'),
      actionHref: `/app/${eventId}/settings`,
    },
  ];

  return (
    <Onboarding
      title={t('title')}
      outOf={t('outOf')}
      stepsLeft={t('stepsLeft')}
      steps={steps}
    />
  );
}
