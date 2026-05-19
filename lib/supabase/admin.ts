import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

type ImpersonationContext = { userId: string } | null;

// TODO: wrap with React cache() to deduplicate DB calls within a single render
export async function getImpersonation(): Promise<ImpersonationContext> {
  const cookieStore = await cookies();
  const impersonateId = cookieStore.get('impersonate_user_id')?.value;
  if (!impersonateId) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  return profile?.is_admin ? { userId: impersonateId } : null;
}

export async function getEffectiveClient() {
  const impersonation = await getImpersonation();
  const supabase = impersonation ? createServiceClient() : await createClient();
  return { supabase, impersonation };
}

export async function assertAdmin(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) redirect('/app');

  return user.id;
}

export async function assertNotImpersonating(): Promise<string | null> {
  const impersonation = await getImpersonation();
  return impersonation ? 'Read-only mode (impersonation)' : null;
}
