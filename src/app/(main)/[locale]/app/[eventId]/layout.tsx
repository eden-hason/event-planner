import React from 'react';
import { redirect } from '@/i18n/navigation';
import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getAllUserEvents, getEventById } from '@/features/events/queries';
import { getEffectiveUser } from '@/features/auth/queries';
import { getCollaboratorRole } from '@/features/collaborate/queries';
import { Card, CardContent } from '@/components/ui/card';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppTopBar } from '@/components/layout/app-top-bar';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { LayoutContentWrapper } from '@/components/layout/layout-content-wrapper';
import { ImpersonationBanner } from '@/features/admin/components/impersonation-banner';
import {
  FeatureLayoutProvider,
  FeatureLayoutHeader,
  CollaborationProvider,
} from '@/components/feature-layout';
import { AiAssistant } from '@/features/ai-chat';

/**
 * The app shell, and the guard that decides whether it should exist at all.
 *
 * The shell lives here rather than one level up at `/app` because `/app` is a
 * router, not a page: it only decides between the takeover and a dashboard.
 * A layout there would render - and stream - before the page underneath could
 * redirect, showing a frame of sidebar and chrome on the way to somewhere else.
 * Every route that genuinely wants the shell has an event id, so the shell
 * starts where the event does.
 */
export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; eventId: string }>;
}) {
  const { locale, eventId } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();

  // Fetched together: the event decides whether this layout renders, and the
  // rest is what it renders with. Waiting for one before starting the others
  // would make the shell arrive a round trip later than it used to.
  const [{ data: auth }, event, effectiveUser, events] = await Promise.all([
    supabase.auth.getUser(),
    getEventById(eventId),
    getEffectiveUser(),
    getAllUserEvents(),
  ]);

  if (!auth.user) {
    return redirect({ href: '/login', locale });
  }

  // A Draft Event is not a workspace: it may have no date, and every page below
  // this layout assumes the answers exist. Reaching one by URL sends the user
  // back into onboarding to finish it, which is the only way out of the state.
  if (!event || event.status === 'draft') {
    redirect({ href: '/start', locale });
  }

  const collaboratorRole = await getCollaboratorRole(eventId);
  const role = collaboratorRole?.role ?? 'owner';
  const isCreator = collaboratorRole?.isCreator ?? true;

  const user = {
    id: effectiveUser?.id ?? auth.user.id,
    name: effectiveUser?.displayName || '',
    email: effectiveUser?.email,
    phone: effectiveUser?.phone,
    avatar: effectiveUser?.avatar,
  };

  return (
    <SidebarProvider className="app-shell-gradient min-h-svh flex-col">
      <AppTopBar user={user} />
      <div className="flex min-h-0 w-full flex-1">
        <AppSidebar
          variant="floating"
          className="top-(--app-header-offset) h-[calc(100svh-var(--app-header-offset))]"
          events={events}
          currentUserId={effectiveUser?.id ?? auth.user.id}
        />
        <SidebarInset className="bg-transparent">
          <ImpersonationBanner />
          <LayoutContentWrapper>
            <CollaborationProvider role={role} isCreator={isCreator}>
              <FeatureLayoutProvider>
                <Card className="min-h-[calc(100vh-101px)] gap-4 border-none bg-transparent p-0 shadow-none">
                  <FeatureLayoutHeader />
                  <CardContent className="space-y-6 p-0">{children}</CardContent>
                </Card>
                <AiAssistant eventId={eventId} />
              </FeatureLayoutProvider>
            </CollaborationProvider>
          </LayoutContentWrapper>
          <MobileBottomNav />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
