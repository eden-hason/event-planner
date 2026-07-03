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
    <div className="sticky top-0 z-50 flex items-center justify-between gap-4 border-b border-amber-300 bg-amber-50 px-5 py-2.5 text-sm text-amber-900">
      <div className="flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
        <span>
          Viewing as <span className="font-semibold">{displayName}</span>
          <span className="ml-2 text-amber-600">· Read-only</span>
        </span>
      </div>
      <form action={stopImpersonation.bind(null, impersonation.userId)}>
        <button
          type="submit"
          className="rounded-md border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-800 shadow-sm transition-colors hover:bg-amber-100"
        >
          Exit
        </button>
      </form>
    </div>
  );
}
