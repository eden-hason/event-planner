import { getSchedules } from "@/lib/dal";
import { Item, ItemTitle, ItemContent, ItemDescription, ItemActions } from "@/components/ui/item";
import {ClipboardClock} from "lucide-react";

export default async function SchedulesPage() {
  const schedules = await getSchedules();
  console.log('schedules:', schedules);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Item variant="outline" className="py-6">
        <ItemContent>
          <ItemTitle className="font-bold text-2xl">4</ItemTitle>
          <ItemDescription>
            Total Schedules 
          </ItemDescription>
          
        </ItemContent>
        <ItemActions>
            <ClipboardClock />
          </ItemActions>
      </Item>

      <Item variant="outline">
        <ItemContent>
          <ItemTitle className="font-bold text-2xl">4</ItemTitle>
          <ItemDescription>
            Total Schedules
          </ItemDescription>
          
        </ItemContent>
        <ItemActions>
            <ClipboardClock />
          </ItemActions>
      </Item>

      <Item variant="outline">
        <ItemContent>
          <ItemTitle className="font-bold text-2xl">4</ItemTitle>
          <ItemDescription>
            Total Schedules
          </ItemDescription>
          
        </ItemContent>
        <ItemActions>
            <ClipboardClock />
          </ItemActions>
      </Item>

      <Item variant="outline">
        <ItemContent>
          <ItemTitle className="font-bold text-2xl">4</ItemTitle>
          <ItemDescription>
            Total Schedules
          </ItemDescription>
          
        </ItemContent>
        <ItemActions>
            <ClipboardClock />
          </ItemActions>
      </Item>
      
    </div>
  );
}
