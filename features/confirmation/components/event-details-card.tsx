import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { ConfirmationPageData } from '@/features/confirmation/schemas';

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(timeString: string): string {
  // Handle "HH:MM" or "HH:MM:SS" format
  const [hours, minutes] = timeString.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

export function EventDetailsCard({
  event,
}: {
  event: ConfirmationPageData['event'];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{event.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-start gap-2">
          <span className="text-muted-foreground w-20 shrink-0 font-medium">
            Date
          </span>
          <span>{formatDate(event.eventDate)}</span>
        </div>

        {event.ceremonyTime && (
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground w-20 shrink-0 font-medium">
              Ceremony
            </span>
            <span>{formatTime(event.ceremonyTime)}</span>
          </div>
        )}

        {event.receptionTime && (
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground w-20 shrink-0 font-medium">
              Reception
            </span>
            <span>{formatTime(event.receptionTime)}</span>
          </div>
        )}

        {event.location && (
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground w-20 shrink-0 font-medium">
              Location
            </span>
            <span>{event.location.name}</span>
          </div>
        )}

        {event.description && (
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground w-20 shrink-0 font-medium">
              Details
            </span>
            <span className="whitespace-pre-line">{event.description}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
