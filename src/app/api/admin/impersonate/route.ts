import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { assertAdmin } from '@/lib/supabase/admin';

/**
 * Starts impersonation for "View as owner". A route handler rather than a
 * Server Action because the button opens the Owner app in a new tab: React
 * submits an action form itself and ignores `target`, while a native POST
 * honours it. POST, so a cross-site link cannot start a session (the session
 * cookie is `SameSite=Lax`).
 */
export async function POST(request: NextRequest) {
  await assertAdmin();

  const userId = (await request.formData()).get('userId');
  if (typeof userId !== 'string' || !userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  const cookieStore = await cookies();
  cookieStore.set('impersonate_user_id', userId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  });

  // 303 so the browser follows with a GET.
  return NextResponse.redirect(new URL('/app', request.url), 303);
}
