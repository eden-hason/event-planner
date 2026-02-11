import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CalendarDays, Clock, MapPin, Heart } from 'lucide-react';
import type { ConfirmationPageData } from '../schemas';

interface EventDetailsCardProps {
  event: ConfirmationPageData['event'];
}

export function EventDetailsCard({ event }: EventDetailsCardProps) {
  const formattedDate = new Intl.DateTimeFormat('he-IL', {
    dateStyle: 'full',
  }).format(new Date(event.eventDate));

  // Build Google Maps link if coordinates exist
  const mapsLink = event.location?.coords
    ? `https://www.google.com/maps/search/?api=1&query=${event.location.coords.lat},${event.location.coords.lng}`
    : null;

  // Extract host names for wedding events
  const hostDetails = event.hostDetails as
    | { bride?: { name?: string }; groom?: { name?: string } }
    | undefined;
  const brideName = hostDetails?.bride?.name;
  const groomName = hostDetails?.groom?.name;
  const hasHosts = brideName || groomName;

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{event.title}</CardTitle>
        {hasHosts && (
          <p className="text-muted-foreground text-lg">
            {[brideName, groomName].filter(Boolean).join(' & ')}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <CalendarDays className="text-muted-foreground size-5 shrink-0" />
          <span>{formattedDate}</span>
        </div>

        {(event.ceremonyTime || event.receptionTime) && (
          <div className="flex items-center gap-3">
            <Clock className="text-muted-foreground size-5 shrink-0" />
            <div className="flex flex-col">
              {event.ceremonyTime && <span>טקס: {event.ceremonyTime}</span>}
              {event.receptionTime && (
                <span>קבלת פנים: {event.receptionTime}</span>
              )}
            </div>
          </div>
        )}

        {(event.venueName || event.location?.name) && (
          <div className="flex items-center gap-3">
            <MapPin className="text-muted-foreground size-5 shrink-0" />
            {mapsLink ? (
              <a
                href={mapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-4"
              >
                {event.venueName || event.location?.name}
              </a>
            ) : (
              <span>{event.venueName || event.location?.name}</span>
            )}
          </div>
        )}

        {hasHosts && (
          <div className="flex items-center gap-3">
            <Heart className="text-muted-foreground size-5 shrink-0" />
            <span>
              {[brideName, groomName].filter(Boolean).join(' ו')}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
