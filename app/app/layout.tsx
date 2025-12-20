import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { AppHeader } from '@/components/app-header';
import { getInitialSetupStatus } from '@/lib/dal';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { SetupRedirect } from '@/components/setup-redirect';
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
    <SidebarProvider className="!bg-[#F4F4F6]">
      <AppSidebar variant="inset" events={events} />
      <SidebarInset>
        <AppHeader user={user} />
        <main className="bg-muted/50 px-4 py-4 md:px-12">
          <div className="container mx-auto">
            <SetupRedirect isSetupComplete={isSetupComplete} />
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
