'use client';

import { useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useFeatureHeader } from '@/components/feature-layout';
import { CollaborateTab } from './collaborate-tab';
import type { CollaboratorApp } from '../schemas';

interface CollaboratePageProps {
  eventId: string;
  currentUserId?: string;
  collaborators: CollaboratorApp[];
  coPlannerLink: string | null;
}

export function CollaboratePage({
  eventId,
  currentUserId,
  collaborators,
  coPlannerLink,
}: CollaboratePageProps) {
  const t = useTranslations('collaborate.page');

  const headerConfig = useMemo(
    () => ({
      title: t('header.title'),
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
        coPlannerLink={coPlannerLink}
      />
    </div>
  );
}
