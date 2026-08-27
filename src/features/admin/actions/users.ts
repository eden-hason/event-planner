'use server';

import { assertAdmin } from '@/lib/supabase/admin';

export type SetTestAccountResult = { success: boolean; message: string };

/**
 * `profiles.is_test_account` marks accounts that belong to the team - see
 * queries/test-accounts.ts. Every Back Office read runs through
 * `getTestScope()`, so flipping this flag silently changes every count in the
 * Back Office: Overview cards, the events index, search, drill-downs.
 *
 * Today nothing can write this flag (it is a manual SQL update) and the brief
 * names this page as where that action belongs. The confirm flow above this
 * action is real and wired end to end; the write itself is deliberately left
 * out pending an explicit go-ahead, since it is the one action here that
 * changes numbers everywhere else in the Back Office. Once that sign-off
 * happens, this becomes:
 *
 *   const supabase = createServiceClient();
 *   const { error } = await supabase
 *     .from('profiles')
 *     .update({ is_test_account: value })
 *     .eq('id', userId);
 *   if (error) return { success: false, message: error.message };
 *   revalidatePath('/admin', 'layout');
 *   return {
 *     success: true,
 *     message: value ? 'Marked as a test account' : 'Test account mark removed',
 *   };
 */
export async function setUserTestAccountFlag(
  userId: string,
  value: boolean,
): Promise<SetTestAccountResult> {
  void userId;
  void value;
  await assertAdmin();

  return {
    success: false,
    message: 'Marking test accounts is not wired to the database yet',
  };
}
