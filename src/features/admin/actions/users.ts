'use server';

import { revalidatePath } from 'next/cache';
import { assertAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { areTestAccountsVisible } from '../queries/test-accounts';

export type SetTestAccountResult = {
  success: boolean;
  message: string;
  /**
   * True when the write has just moved this User outside what the Operator is
   * currently looking at: they are now flagged and the global toggle is off.
   * The sheet is open on a row that no longer exists, so the caller navigates
   * out of it rather than refreshing into "User not found" - see
   * MarkTestAccountDialog.
   */
  userHidden: boolean;
};

/**
 * `profiles.is_test_account` marks accounts that belong to the team - see
 * queries/test-accounts.ts. Every Back Office read runs through
 * `getTestScope()`, so flipping this flag changes every count in the Back
 * Office at once: Overview cards, the events index, search, drill-downs. That
 * is why the whole shell is revalidated rather than the Users page, and why
 * the confirm dialog above this action names the consequence in plain words.
 *
 * The column is writable by `service_role` only - the grants in
 * 20260824000001_enable_rls_on_profiles.sql name columns explicitly, so one
 * added later is unwritable by `authenticated` and the migration asserts it.
 * The service client here is the only thing that can move it.
 */
export async function setUserTestAccountFlag(
  userId: string,
  value: boolean,
): Promise<SetTestAccountResult> {
  await assertAdmin();
  const supabase = createServiceClient();

  try {
    const { data: profile, error: readError } = await supabase
      .from('profiles')
      .select('id, is_test_account')
      .eq('id', userId)
      .maybeSingle();
    if (readError) throw readError;

    if (!profile) {
      return { success: false, message: 'That user no longer exists', userHidden: false };
    }

    // Marking hides the account everywhere unless the Operator has the toggle
    // on; unmarking never hides anything.
    const userHidden = value && !(await areTestAccountsVisible());

    // Already in the target state: report it honestly rather than writing a
    // no-op row, but still tell the caller where the User stands so a sheet
    // opened on a stale detail does not linger.
    if (!!profile.is_test_account === value) {
      return {
        success: true,
        message: value ? 'Already marked as a test account' : 'That account carries no test mark',
        userHidden,
      };
    }

    const { error } = await supabase
      .from('profiles')
      .update({ is_test_account: value })
      .eq('id', userId);
    if (error) throw error;

    revalidatePath('/admin', 'layout');

    return {
      success: true,
      message: value ? 'Marked as a test account' : 'Test account mark removed',
      userHidden,
    };
  } catch (error) {
    console.error('setUserTestAccountFlag failed:', error);
    return { success: false, message: 'Failed to update the test account mark', userHidden: false };
  }
}
