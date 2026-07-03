import { getEventExpenses } from '@/features/budget/queries/expenses';
import { getEventGifts } from '@/features/budget/queries/gifts';
import { getEventById } from '@/features/events/queries';
import { BudgetPage } from '@/features/budget';

export default async function BudgetPageRoute({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  const [expenses, event, gifts] = await Promise.all([
    getEventExpenses(eventId),
    getEventById(eventId),
    getEventGifts(eventId),
  ]);

  return (
    <BudgetPage
      expenses={expenses}
      eventId={eventId}
      eventBudget={event?.budget ?? null}
      gifts={gifts}
    />
  );
}
