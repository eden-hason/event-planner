import { Suspense } from 'react';
import { TriangleAlert } from '@/components/icons';
import {
  RetryButton,
  UserSheet,
  UserSheetError,
  UserSheetShell,
  UserSheetSkeleton,
  UsersIndex,
  UsersIndexSkeleton,
  type UsersIndexFilters,
} from '@/features/admin';
import { getUserDetail, getUsersIndex } from '@/features/admin/queries/users';
import { areTestAccountsVisible } from '@/features/admin/queries/test-accounts';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Nothing is awaited here on purpose.
 *
 * Both halves of this route are separately slow and separately interesting, so
 * each gets its own Suspense boundary and the page itself returns its shell
 * immediately. That is what makes a row click feel instant:
 *
 * - The directory boundary already exists once the table has rendered, so a
 *   navigation that only adds `?user=` leaves it alone. React keeps the
 *   rendered table on screen for the duration of the transition instead of
 *   dropping back to UsersIndexSkeleton, so the page does not flash.
 * - The sheet's shell is not inside a boundary at all - it mounts and starts
 *   its slide-in on the first frame - while its contents are keyed on the user
 *   id, so switching users swaps to the skeleton rather than showing the
 *   previous user's details under a new name.
 *
 * Awaiting either query up here would collapse all of that back into one
 * blocking navigation, which is exactly the pause this replaced.
 */
export default async function UsersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filters: UsersIndexFilters = {
    q: typeof params.q === 'string' ? params.q.slice(0, 100) : '',
    page: Math.max(1, Number.parseInt(typeof params.page === 'string' ? params.page : '1', 10) || 1),
  };
  const openUserId = typeof params.user === 'string' ? params.user : null;

  return (
    <>
      <Suspense fallback={<UsersIndexSkeleton />}>
        <UsersDirectory filters={filters} openUserId={openUserId} />
      </Suspense>

      {openUserId && (
        <UserSheetShell>
          <Suspense key={openUserId} fallback={<UserSheetSkeleton />}>
            <UserSheetContents userId={openUserId} />
          </Suspense>
        </UserSheetShell>
      )}
    </>
  );
}

async function UsersDirectory({
  filters,
  openUserId,
}: {
  filters: UsersIndexFilters;
  openUserId: string | null;
}) {
  try {
    const [data, testAccountsVisible] = await Promise.all([
      getUsersIndex(filters),
      areTestAccountsVisible(),
    ]);

    return (
      <UsersIndex
        data={data}
        filters={filters}
        openUserId={openUserId}
        testAccountsVisible={testAccountsVisible}
      />
    );
  } catch (error) {
    console.error('Users index failed:', error);
    return (
      <div className="bg-card flex flex-col items-center gap-2 rounded-xl border px-6 py-14 text-center">
        <TriangleAlert className="text-destructive size-6" />
        <h1 className="text-destructive text-[14.5px] font-medium">Users didn&apos;t load</h1>
        <p className="text-muted-foreground max-w-sm text-[13px] leading-relaxed text-balance">
          The directory is unavailable right now, so there is no count to show. Nothing here means
          zero users
        </p>
        <RetryButton />
      </div>
    );
  }
}

async function UserSheetContents({ userId }: { userId: string }) {
  try {
    const detail = await getUserDetail(userId);
    return <UserSheet detail={detail ?? 'not-found'} />;
  } catch (error) {
    console.error('User detail failed:', error);
    return <UserSheetError />;
  }
}
