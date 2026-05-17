import { assertAdmin } from '@/lib/supabase/admin';
import { AdminSidebar } from '@/features/admin/components/admin-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { setRequestLocale } from 'next-intl/server';

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  await assertAdmin();

  return (
    <div dir="ltr">
      <SidebarProvider className="!bg-[#F4F4F6]">
        <AdminSidebar />
        <SidebarInset className="!bg-[#F4F4F6]">
          <div className="p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
