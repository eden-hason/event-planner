import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cardHover } from '@/lib/utils';
import { IconCheck, IconX, IconClock } from '@tabler/icons-react';
import type { RecentRsvpRow } from '../types';

function getActionLabel(status: RecentRsvpRow['rsvpStatus']): string {
  switch (status) {
    case 'confirmed':
      return 'confirmed attendance';
    case 'declined':
      return 'declined invitation';
    case 'pending':
      return 'updated their RSVP';
  }
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function StatusIcon({ status }: { status: RecentRsvpRow['rsvpStatus'] }) {
  if (status === 'confirmed') {
    return (
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <IconCheck className="h-3.5 w-3.5" strokeWidth={2.5} />
      </div>
    );
  }
  if (status === 'declined') {
    return (
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-500">
        <IconX className="h-3.5 w-3.5" strokeWidth={2.5} />
      </div>
    );
  }
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
      <IconClock className="h-3.5 w-3.5" />
    </div>
  );
}

export function RecentRsvpActivityCard({
  activity,
  eventId,
}: {
  activity: RecentRsvpRow[];
  eventId: string;
}) {
  return (
    <Card className={`flex flex-col ${cardHover}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">Latest RSVP updates</p>
          </div>
          <Link
            href={`/app/${eventId}/guests`}
            className="shrink-0 text-xs text-primary underline-offset-4 hover:underline"
          >
            View All →
          </Link>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        {activity.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No recent RSVP changes</p>
        ) : (
          activity.map((row) => (
            <div key={row.id} className="flex items-start gap-3">
              <StatusIcon status={row.rsvpStatus} />
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug">
                  <span className="font-medium">{row.name}</span>
                  <span className="text-muted-foreground"> {getActionLabel(row.rsvpStatus)}</span>
                </p>
                <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <IconClock className="h-3 w-3 shrink-0" />
                  <span>{formatRelativeTime(row.rsvpChangedAt)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
      <CardFooter className="pt-2">
        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link href={`/app/${eventId}/guests`}>View All Guests</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
