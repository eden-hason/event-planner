import { PaymentsIndex, parsePaymentsIndexParams, RetryButton } from '@/features/admin';
import { TriangleAlert } from '@/components/icons';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { getPaymentsIndex } from '@/features/admin/queries/payments';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function PaymentsPage({ searchParams }: { searchParams: SearchParams }) {
  const filters = parsePaymentsIndexParams(await searchParams);

  try {
    return <PaymentsIndex data={await getPaymentsIndex(filters)} filters={filters} />;
  } catch (error) {
    console.error('Payments index failed:', error);
    return (
      <Empty className="bg-card min-h-80 border">
        <EmptyHeader>
          <EmptyMedia variant="icon"><TriangleAlert /></EmptyMedia>
          <EmptyTitle>התשלומים לא נטענו</EmptyTitle>
          <EmptyDescription>
            משהו השתבש בטעינת הרשימה, כך שאין מה להציג. זה לא אומר שאין תשלומים
          </EmptyDescription>
        </EmptyHeader>
        <RetryButton />
      </Empty>
    );
  }
}
