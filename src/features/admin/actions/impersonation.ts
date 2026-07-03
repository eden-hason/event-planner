'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { assertAdmin } from '@/lib/supabase/admin';

export async function startImpersonation(userId: string) {
  await assertAdmin();
  const cookieStore = await cookies();
  cookieStore.set('impersonate_user_id', userId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  });
  redirect('/app');
}

export async function stopImpersonation(returnUserId?: string) {
  await assertAdmin();
  const cookieStore = await cookies();
  cookieStore.delete('impersonate_user_id');
  redirect(returnUserId ? `/admin/users/${returnUserId}` : '/admin/users');
}
