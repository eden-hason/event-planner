'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { assertAdmin } from '@/lib/supabase/admin';

export async function stopImpersonation() {
  await assertAdmin();
  const cookieStore = await cookies();
  cookieStore.delete('impersonate_user_id');
  redirect('/admin');
}
