'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { assertAdmin } from '@/lib/supabase/admin';
import { TEST_ACCOUNTS_COOKIE } from '../queries/test-accounts';

/**
 * Switches the test-account exclusion off (visible) or back on (hidden) for
 * this browser. Every Back Office read goes through getTestScope, so the whole
 * shell - counts, queues, search, drill-downs - has to be revalidated, not just
 * the page the switch happens to sit on.
 *
 * No expiry: the choice is a working mode, not a session, and an Operator who
 * left it on should find it on tomorrow rather than wonder why the numbers
 * moved overnight.
 */
export async function setTestAccountsVisible(visible: boolean) {
  await assertAdmin();
  const cookieStore = await cookies();

  if (visible) {
    cookieStore.set(TEST_ACCOUNTS_COOKIE, '1', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    });
  } else {
    cookieStore.delete(TEST_ACCOUNTS_COOKIE);
  }

  revalidatePath('/admin', 'layout');
}
