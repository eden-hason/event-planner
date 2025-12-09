import React from 'react';
import { redirect } from 'next/navigation';
import { getEventById } from '@/features/events/queries';

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

  return <>{children}</>;
}
