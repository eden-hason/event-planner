import { Onboarding } from '@/components/onboarding';
import type { OnboardingStatus } from '@/features/dashboard/types';
import type { OnboardingStep } from '@/components/onboarding';

function buildSteps(
  eventId: string,
  status: OnboardingStatus,
): OnboardingStep[] {
  return [
    {
      id: 'details',
      title: 'Complete your event details',
      description:
        'Add ceremony time and other key details so guests know what to expect.',
      completed: status.detailsComplete,
      actionLabel: 'Edit details',
      actionHref: `/app/${eventId}/details`,
    },
    {
      id: 'guests',
      title: 'Add your first guest',
      description:
        'Start building your guest list by adding guests one by one or via CSV import.',
      completed: status.hasGuests,
      actionLabel: 'Manage guests',
      actionHref: `/app/${eventId}/guests`,
    },
    {
      id: 'groups',
      title: 'Organize guests into groups',
      description:
        'Create groups to keep your guest list organized by family, side, or relationship.',
      completed: status.hasGroups,
      actionLabel: 'Manage groups',
      actionHref: `/app/${eventId}/guests`,
    },
    {
      id: 'invitation',
      title: 'Upload your invitation design',
      description:
        'Add a beautiful invitation image so guests see it when they open their RSVP link.',
      completed: status.hasInvitationImage,
      actionLabel: 'Upload invitation',
      actionHref: `/app/${eventId}/details`,
    },
    {
      id: 'collaborator',
      title: 'Add a co-organizer',
      description:
        'Invite a partner or family member to help manage RSVPs and guest details.',
      completed: status.hasCollaborator,
      actionLabel: 'Manage collaborators',
      actionHref: `/app/${eventId}/settings`,
    },
  ];
}

export function OnboardingChecklistCard({
  eventId,
  status,
}: {
  eventId: string;
  status: OnboardingStatus;
}) {
  return (
    <Onboarding
      title="Get started with Kululu"
      steps={buildSteps(eventId, status)}
    />
  );
}
