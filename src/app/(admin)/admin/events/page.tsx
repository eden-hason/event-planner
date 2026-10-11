import { EventsIndex, parseEventsIndexParams, RetryButton } from '@/features/admin';
import { TriangleAlert } from '@/components/icons';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { getEventsIndex } from '@/features/admin/queries/events';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function EventsPage({ searchParams }: { searchParams: SearchParams }) {
  const filters = parseEventsIndexParams(await searchParams);

  try {
    return <EventsIndex data={await getEventsIndex(filters)} filters={filters} />;
  } catch (error) {
    console.error('Events index failed:', error);
    return (
      <Empty className="bg-card min-h-80 border">
        <EmptyHeader>
          <EmptyMedia variant="icon"><TriangleAlert /></EmptyMedia>
          <EmptyTitle>האירועים לא נטענו</EmptyTitle>
          <EmptyDescription>משהו השתבש בטעינת הרשימה. אפשר לנסות שוב בעוד רגע</EmptyDescription>
        </EmptyHeader>
        <RetryButton />
      </Empty>
    );
  }
}
