import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { redirect } from '@/i18n/navigation';
import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getAllUserEvents } from '@/features/events/queries';
import { getEffectiveUser } from '@/features/auth/queries';
import { AiChatButton } from '@/features/ai-chat/components/ai-chat-button';
import { LayoutContentWrapper } from '@/components/layout-content-wrapper';
import { ImpersonationBanner } from '@/features/admin/components/impersonation-banner';
import { MobileBlock } from '@/components/mobile-block';

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

  const effectiveUser = await getEffectiveUser();

  const user = {
    name: effectiveUser?.displayName || '',
    email: effectiveUser?.email,
    phone: effectiveUser?.phone,
    avatar: effectiveUser?.avatar,
  };

  // Fetch events for the effective user (impersonation-aware)
  const events = await getAllUserEvents();

  return (
    <MobileBlock>
      <SidebarProvider className="!bg-[#F4F4F6]">
        <AppSidebar
          variant="floating"
          events={events}
          currentUserId={effectiveUser?.id ?? data.user.id}
          user={user}
        />
        <SidebarInset className="!bg-[#F4F4F6]">
          <ImpersonationBanner />
          <LayoutContentWrapper>{children}</LayoutContentWrapper>
          {process.env.ENABLE_AI_CHAT === 'true' && <AiChatButton />}
        </SidebarInset>
      </SidebarProvider>
    </MobileBlock>
  );
}
