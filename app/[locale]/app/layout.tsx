import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { redirect } from '@/i18n/navigation';
import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getAllUserEvents } from '@/features/events/queries';

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    return redirect({ href: '/login', locale });
  }

  // Get user data from auth
  const user = {
    name:
      data.user.user_metadata?.name ||
      data.user.email ||
      data.user.phone ||
      '',
    email: data.user.email,
    phone: data.user.phone,
    avatar: data.user.user_metadata?.avatar_url,
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
