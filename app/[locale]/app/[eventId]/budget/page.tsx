import { getEventExpenses } from '@/features/budget/queries/expenses';
import { getEventGifts } from '@/features/budget/queries/gifts';
import { getEventGuestsWithGroups } from '@/features/guests/queries';
import { BudgetPage } from '@/features/budget/components';

export default async function BudgetPageRoute({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  const [expenses, gifts, guests] = await Promise.all([
    getEventExpenses(eventId),
    getEventGifts(eventId),
    getEventGuestsWithGroups(eventId),
  ]);

  const guestOptions = guests.map((g) => ({ id: g.id, name: g.name }));

  return (
    <BudgetPage
      expenses={expenses}
      gifts={gifts}
      eventId={eventId}
      guests={guestOptions}
    />
  );
}
