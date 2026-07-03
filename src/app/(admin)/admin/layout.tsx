import { assertAdmin } from '@/lib/supabase/admin';
import { AdminSidebar } from '@/features/admin/components/admin-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
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
