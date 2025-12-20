import React from 'react';
import { redirect } from 'next/navigation';
import { getEventById } from '@/features/events/queries';
import { Card, CardContent } from '@/components/ui/card';
import {
  FeatureLayoutProvider,
  FeatureLayoutHeader,
} from '@/components/feature-layout';

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = await getEventById(eventId);

  if (!event) {
    redirect('/app/onboarding');
  }

  return (
    <FeatureLayoutProvider>
      <Card className="min-h-[calc(100vh-101px)] border-none bg-transparent p-0 shadow-none">
        <FeatureLayoutHeader />
        <CardContent className="space-y-6">{children}</CardContent>
      </Card>
    </FeatureLayoutProvider>
  );
}
