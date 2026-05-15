import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { redirect } from '@/i18n/navigation';
import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getAllUserEvents } from '@/features/events/queries';
import { AiChatButton } from '@/features/ai-chat/components/ai-chat-button';

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

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, phone_number')
    .eq('id', data.user.id)
    .single();

  const user = {
    name:
      profile?.full_name ||
      data.user.user_metadata?.name ||
      data.user.email ||
      data.user.phone ||
      '',
    email: data.user.email,
    phone: profile?.phone_number || data.user.phone,
    avatar: profile?.avatar_url || data.user.user_metadata?.avatar_url,
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
        {process.env.ENABLE_AI_CHAT === 'true' && <AiChatButton />}
      </SidebarInset>
    </SidebarProvider>
  );
}
