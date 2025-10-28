import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { AppHeader } from '@/components/app-header';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (!data.user) {
    redirect('/login');
  }

  const user = {
    name: data.user.user_metadata.name,
    email: data.user.email,
    avatar: data.user.user_metadata.avatar_url,
  };

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" user={user} />
      <SidebarInset>
        <AppHeader user={user} />
        <main className="container mx-auto p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
