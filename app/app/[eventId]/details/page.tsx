import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getEventById } from '@/features/events/queries';
import {
  IconUsers,
  IconCalendar,
  IconClock,
  IconHeartFilled,
  IconInfoSquareRounded,
  IconGlassCocktail,
  IconBeer,
  IconMapPin,
} from '@tabler/icons-react';
import {
  Item,
  ItemContent,
  ItemMedia,
  ItemTitle,
  ItemDescription,
} from '@/components/ui/item';
import { Separator } from '@/components/ui/separator';
import { EventDetailsHeader } from '@/features/events/components';

export default async function EventDetailsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = await getEventById(eventId);

  if (!event) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Event not found</p>
      </div>
    );
  }

  return (
    <>
      <EventDetailsHeader />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <span className="flex items-center justify-center rounded-md bg-red-200 p-1.5">
              <IconInfoSquareRounded className="size-4 text-white" />
            </span>
            Event Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-red-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Event Date
                </CardTitle>
                <IconCalendar className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">March 27, 2026</div>
              </CardContent>
            </Card>

            <Card className="border-red-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Expected Guests
                </CardTitle>
                <IconUsers className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">250</div>
              </CardContent>
            </Card>

            <Card className="border-red-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Start Time
                </CardTitle>
                <IconClock className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">19:30</div>
              </CardContent>
            </Card>

            <Card className="border-red-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Ceremony Time
                </CardTitle>
                <IconCalendar className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">21:00</div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <span className="flex items-center justify-center rounded-md bg-red-200 p-1.5">
              <IconHeartFilled className="size-4 text-white" />
            </span>
            The Happy Couple
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="gap-2 border-red-200 bg-red-100 shadow-none">
              <CardHeader>
                <Item className="p-0">
                  <ItemMedia variant="icon">
                    <IconGlassCocktail className="size-4" />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle className="text-muted-foreground">
                      Bride
                    </ItemTitle>
                    <ItemDescription className="text-foreground text-lg font-bold">
                      Orel Hason
                    </ItemDescription>
                  </ItemContent>
                </Item>
                <Separator className="my-2 bg-red-200" />
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <p className="text-muted-foreground text-sm">Parents</p>
                <div className="rounded-md bg-white p-2">
                  <p>
                    Jane Baily
                    <br />
                    Tobias Bailey
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="gap-2 border-sky-200 bg-sky-100 shadow-none">
              <CardHeader>
                <Item className="p-0">
                  <ItemMedia variant="icon">
                    <IconBeer className="size-4" />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle className="text-muted-foreground">
                      Groom
                    </ItemTitle>
                    <ItemDescription className="text-foreground text-lg font-bold">
                      Eden Hason
                    </ItemDescription>
                  </ItemContent>
                </Item>
                <Separator className="my-2 bg-sky-200" />
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <p className="text-muted-foreground text-sm">Parents</p>
                <div className="rounded-md bg-white p-2">
                  <p>
                    Yaron Hason
                    <br />
                    Liora Hason
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <span className="bg-muted-foreground flex items-center justify-center rounded-md p-1.5">
              <IconMapPin className="size-4 text-white" />
            </span>
            Event Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>The event will take place at the following location:</p>
        </CardContent>
      </Card>
    </>
  );
}
