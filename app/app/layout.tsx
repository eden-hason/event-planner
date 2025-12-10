import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { AppHeader } from '@/components/app-header';
import { getInitialSetupStatus } from '@/lib/dal';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { SetupRedirect } from '@/components/setup-redirect';
import { Suspense } from 'react';
import Loading from './loading';
import { getAllUserEvents } from '@/features/events/queries';

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect('/login');
  }

  // Get user data from auth
  const user = {
    name: data.user.user_metadata.name,
    email: data.user.email,
    avatar: data.user.user_metadata.avatar_url,
  };

  // Fetch user events
  const events = await getAllUserEvents();

  // Check if user has completed initial setup
  const isSetupComplete = await getInitialSetupStatus();

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" events={events} />
      <SidebarInset>
        <AppHeader user={user} />
        <main className="container mx-auto p-4">
          <Suspense fallback={<Loading />}>
            <SetupRedirect isSetupComplete={isSetupComplete} />
            {children}
          </Suspense>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
