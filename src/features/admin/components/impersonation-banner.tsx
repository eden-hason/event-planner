import { getImpersonation } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { stopImpersonation } from '@/features/admin/actions/impersonation';

export async function ImpersonationBanner() {
  const impersonation = await getImpersonation();
  if (!impersonation) return null;

  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', impersonation.userId)
    .single();

  const displayName = profile?.full_name || profile?.email || impersonation.userId;

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-4 border-warning/30 bg-warning/10 text-warning border-b px-5 py-2.5 text-sm">
      <div className="flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full bg-warning" />
        <span>
          Viewing as <span className="font-semibold">{displayName}</span>
          <span className="ml-2 opacity-70">· Read-only</span>
        </span>
      </div>
      <form action={stopImpersonation}>
        <button
          type="submit"
          className="border-warning/40 bg-background text-warning hover:bg-warning/15 rounded-md border px-3 py-1 text-xs font-medium transition-colors"
        >
          Exit
        </button>
      </form>
    </div>
  );
}
