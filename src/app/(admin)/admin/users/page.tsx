import { TriangleAlert } from '@/components/icons';
import { RetryButton, UsersIndex, UserSheet } from '@/features/admin';
import { getUserDetail, getUsersIndex } from '@/features/admin/queries/users';
import { areTestAccountsVisible } from '@/features/admin/queries/test-accounts';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function UsersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filters = {
    q: typeof params.q === 'string' ? params.q.slice(0, 100) : '',
    page: Math.max(1, Number.parseInt(typeof params.page === 'string' ? params.page : '1', 10) || 1),
  };
  const openUserId = typeof params.user === 'string' ? params.user : null;

  try {
    const [data, testAccountsVisible, detail] = await Promise.all([
      getUsersIndex(filters),
      areTestAccountsVisible(),
      openUserId ? getUserDetail(openUserId) : Promise.resolve(undefined),
    ]);

    return (
      <>
        <UsersIndex
          data={data}
          filters={filters}
          openUserId={openUserId}
          testAccountsVisible={testAccountsVisible}
        />
        {detail !== undefined && <UserSheet detail={detail ?? 'not-found'} />}
      </>
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
