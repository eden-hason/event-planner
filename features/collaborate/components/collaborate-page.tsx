'use client';

import { useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useFeatureHeader } from '@/components/feature-layout';
import { CollaborateTab } from './collaborate-tab';
import type { CollaboratorApp, InvitationApp } from '../schemas';
import type { GroupApp, GuestApp } from '@/features/guests/schemas';

interface CollaboratePageProps {
  eventId: string;
  currentUserId?: string;
  collaborators: CollaboratorApp[];
  invitations: InvitationApp[];
  groups: GroupApp[];
  guests: GuestApp[];
}

export function CollaboratePage({
  eventId,
  currentUserId,
  collaborators,
  invitations,
  groups,
  guests,
}: CollaboratePageProps) {
  const t = useTranslations('collaborate.page');

  const headerConfig = useMemo(
    () => ({
      title: t('header.title'),
      description: t('header.description'),
      containerClass: 'mx-auto w-full max-w-5xl',
    }),
    [t],
  );
  const { setHeader } = useFeatureHeader(headerConfig);
  useEffect(() => {
    setHeader(headerConfig);
  }, [headerConfig, setHeader]);

  return (
    <div className="mx-auto max-w-5xl">
      <CollaborateTab
        eventId={eventId}
        currentUserId={currentUserId}
        collaborators={collaborators}
        invitations={invitations}
        groups={groups}
        guests={guests}
      />
    </div>
  );
}
