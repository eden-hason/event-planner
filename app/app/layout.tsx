import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
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

  return (
    <SidebarProvider className="!bg-[#F4F4F6]">
      <AppSidebar
        variant="floating"
        events={events}
        currentUserId={data.user.id}
        user={user}
      />
      <SidebarInset className="!bg-[#F4F4F6]">
        <div className="flex-1 py-4">
          <div className="container mx-auto h-full">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
