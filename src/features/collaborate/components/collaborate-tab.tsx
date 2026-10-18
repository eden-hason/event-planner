'use client';

import * as React from 'react';
import {
  IconUserPlus,
  IconUsersGroup,
  IconClipboardCheck,
  IconRefresh,
} from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { CollaboratorsList } from './collaborators-list';
import { CoPlannerLinkCard } from './co-planner-link-card';
import type { CollaboratorApp } from '../schemas';

interface CollaborateTabProps {
  eventId: string;
  currentUserId?: string;
  collaborators: CollaboratorApp[];
  coPlannerLink: string | null;
}

export function CollaborateTab({
  eventId,
  currentUserId,
  collaborators,
  coPlannerLink,
}: CollaborateTabProps) {
  const t = useTranslations('collaborate.tab');

  const FEATURES = [
    {
      icon: IconUsersGroup,
      title: t('features.shareWorkload'),
      description: t('features.shareWorkloadDesc'),
    },
    {
      icon: IconClipboardCheck,
      title: t('features.getHelp'),
      description: t('features.getHelpDesc'),
    },
    {
      icon: IconRefresh,
      title: t('features.keepSync'),
      description: t('features.keepSyncDesc'),
    },
  ];

  // Only the creator's own row means nobody has joined yet
  const hasOnlySelf = collaborators.length <= 1;

  if (hasOnlySelf) {
    return (
      <div className="flex flex-col items-center px-2 py-10 sm:px-6 sm:py-14">
        <div className="relative mb-6">
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-primary/10">
            <IconUserPlus className="h-14 w-14 text-primary" strokeWidth={1.5} />
          </div>
          <span className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
            <span className="text-lg font-bold leading-none">+</span>
          </span>
        </div>

        <h2 className="mb-1 text-xl font-semibold tracking-tight">{t('heading')}</h2>

        <p className="text-muted-foreground mb-8 max-w-md text-center text-sm leading-relaxed">
          {t('description')}
        </p>

        <div className="mb-8 grid w-full max-w-lg grid-cols-3 gap-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="flex flex-col items-center rounded-xl border bg-card px-3 py-5 text-center shadow-sm"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <feature.icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium">{feature.title}</span>
              <span className="text-muted-foreground mt-0.5 text-[11px]">
                {feature.description}
              </span>
            </div>
          ))}
        </div>

        <CoPlannerLinkCard eventId={eventId} link={coPlannerLink} className="w-full max-w-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-muted-foreground mb-3 text-xs font-semibold tracking-widest uppercase">
          {t('activeMembers')}
        </h3>
        <CollaboratorsList collaborators={collaborators} currentUserId={currentUserId} />
      </div>
      <CoPlannerLinkCard eventId={eventId} link={coPlannerLink} />
    </div>
  );
}
