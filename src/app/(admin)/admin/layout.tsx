import { assertAdmin } from '@/lib/supabase/admin';
import { getOperatorIdentity } from '@/features/admin/queries/operator';
import { BackOfficeNav } from '@/features/admin/components/back-office-nav';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

/**
 * The Back Office is an internal staff tool: LTR and English, unlike the
 * Owner-facing app. This gate is not sufficient on its own - Server Actions and
 * route handlers never pass through it, so every query calls assertAdmin too.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await assertAdmin();
  const { email, environment } = await getOperatorIdentity();

  return (
    <div dir="ltr">
      <SidebarProvider style={{ '--sidebar-width': '220px' } as React.CSSProperties}>
        <BackOfficeNav email={email} environment={environment} />
        <SidebarInset className="bg-muted">
          <div className="w-full px-8 py-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
