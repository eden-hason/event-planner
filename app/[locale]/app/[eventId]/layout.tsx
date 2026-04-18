import React from 'react';
import { redirect } from '@/i18n/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getEventById } from '@/features/events/queries';
import { getCollaboratorRole } from '@/features/collaborate/queries';
import { Card, CardContent } from '@/components/ui/card';
import {
  FeatureLayoutProvider,
  FeatureLayoutHeader,
  CollaborationProvider,
} from '@/components/feature-layout';

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; eventId: string }>;
}) {
  const { locale, eventId } = await params;
  setRequestLocale(locale);
  const event = await getEventById(eventId);

  if (!event) {
    redirect({ href: '/app/new-event', locale });
  }

  const collaboratorRole = await getCollaboratorRole(eventId);
  const role = collaboratorRole?.role ?? 'owner';
  const isCreator = collaboratorRole?.isCreator ?? true;

  return (
    <CollaborationProvider role={role} isCreator={isCreator}>
      <FeatureLayoutProvider>
        <Card className="min-h-[calc(100vh-101px)] gap-4 border-none bg-transparent p-0 shadow-none">
          <FeatureLayoutHeader />
          <CardContent className="space-y-6">{children}</CardContent>
        </Card>
      </FeatureLayoutProvider>
    </CollaborationProvider>
  );
}
