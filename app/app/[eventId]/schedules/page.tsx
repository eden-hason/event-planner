import { getSchedules } from '@/lib/dal';
import {
  Item,
  ItemTitle,
  ItemContent,
  ItemDescription,
  ItemActions,
} from '@/components/ui/item';
import { ClipboardClock } from 'lucide-react';
import { SchedulesHeader } from '@/features/schedules/components';

export default async function SchedulesPage() {
  const schedules = await getSchedules();
  console.log('schedules:', schedules);

  return (
    <>
      <SchedulesHeader />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Item variant="outline" className="py-6">
          <ItemContent>
            <ItemTitle className="text-2xl font-bold">4</ItemTitle>
            <ItemDescription>Total Schedules</ItemDescription>
          </ItemContent>
          <ItemActions>
            <ClipboardClock />
          </ItemActions>
        </Item>

        <Item variant="outline">
          <ItemContent>
            <ItemTitle className="text-2xl font-bold">4</ItemTitle>
            <ItemDescription>Total Schedules</ItemDescription>
          </ItemContent>
          <ItemActions>
            <ClipboardClock />
          </ItemActions>
        </Item>

        <Item variant="outline">
          <ItemContent>
            <ItemTitle className="text-2xl font-bold">4</ItemTitle>
            <ItemDescription>Total Schedules</ItemDescription>
          </ItemContent>
          <ItemActions>
            <ClipboardClock />
          </ItemActions>
        </Item>

        <Item variant="outline">
          <ItemContent>
            <ItemTitle className="text-2xl font-bold">4</ItemTitle>
            <ItemDescription>Total Schedules</ItemDescription>
          </ItemContent>
          <ItemActions>
            <ClipboardClock />
          </ItemActions>
        </Item>
      </div>
    </>
  );
}
