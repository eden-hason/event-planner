import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppTopBar } from '@/components/layout/app-top-bar';
import { redirect } from '@/i18n/navigation';
import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getAllUserEvents } from '@/features/events/queries';
import { getEffectiveUser } from '@/features/auth/queries';
import { LayoutContentWrapper } from '@/components/layout/layout-content-wrapper';
import { ImpersonationBanner } from '@/features/admin/components/impersonation-banner';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';

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
    <SidebarProvider className="!min-h-svh flex-col !bg-[#F4F4F6]">
      <AppTopBar />
      <div className="flex min-h-0 w-full flex-1">
        <AppSidebar
          variant="floating"
          events={events}
          currentUserId={effectiveUser?.id ?? data.user.id}
          user={user}
          className="!top-14 !h-[calc(100svh-3.5rem)]"
        />
        <SidebarInset className="!bg-[#F4F4F6]">
          <ImpersonationBanner />
          <LayoutContentWrapper>{children}</LayoutContentWrapper>
          <MobileBottomNav />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
