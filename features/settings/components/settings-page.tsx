'use client';

import { useMemo, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useFeatureHeader } from '@/components/feature-layout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CollaborateTab } from '@/features/collaborate/components/collaborate-tab';
import type { CollaboratorApp, InvitationApp } from '@/features/collaborate/schemas';
import type { GroupApp, GuestApp } from '@/features/guests/schemas';

interface SettingsPageProps {
  eventId: string;
  currentUserId?: string;
  collaborators: CollaboratorApp[];
  invitations: InvitationApp[];
  groups: GroupApp[];
  guests: GuestApp[];
}

export function SettingsPage({
  eventId,
  currentUserId,
  collaborators,
  invitations,
  groups,
  guests,
}: SettingsPageProps) {
  const t = useTranslations('settings');
  const locale = useLocale();

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
    <Tabs defaultValue="team" dir={locale === 'he' ? 'rtl' : 'ltr'} className="mx-auto max-w-5xl">
      <TabsList className="border-border mb-4 h-10 w-full justify-start gap-4 rounded-none border-b bg-transparent p-0">
        <TabsTrigger
          value="team"
          className="data-[state=active]:text-primary data-[state=active]:after:bg-primary relative h-full flex-none rounded-none border-none bg-transparent px-1 pb-3 shadow-none after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
        >
          {t('team.label')}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="team">
        <CollaborateTab
          eventId={eventId}
          currentUserId={currentUserId}
          collaborators={collaborators}
          invitations={invitations}
          groups={groups}
          guests={guests}
        />
      </TabsContent>
    </Tabs>
  );
}
