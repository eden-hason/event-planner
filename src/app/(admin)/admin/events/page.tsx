import { EventsIndex, type EventsIndexStatus } from '@/features/admin';
import { getEventsIndex } from '@/features/admin/queries/events';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function EventsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const rawStatus = typeof params.status === 'string' ? params.status : 'all';
  const status: EventsIndexStatus = ['published', 'draft'].includes(rawStatus)
    ? rawStatus as EventsIndexStatus
    : 'all';
  const filters = {
    q: typeof params.q === 'string' ? params.q.slice(0, 100) : '',
    status,
    needsSetup: params.setup === 'true',
    page: Math.max(1, Number.parseInt(typeof params.page === 'string' ? params.page : '1', 10) || 1),
  };

  try {
    return <EventsIndex data={await getEventsIndex(filters)} filters={filters} />;
  } catch (error) {
    console.error('Events index failed:', error);
    return (
      <div className="bg-card rounded-xl border px-6 py-12 text-center">
        <h1 className="text-lg font-semibold">Events didn&apos;t load</h1>
        <p className="text-muted-foreground mt-1 text-sm">Refresh the page to try again</p>
      </div>
    );
  }
}
