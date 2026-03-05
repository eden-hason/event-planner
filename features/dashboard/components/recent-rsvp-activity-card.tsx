import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { RecentRsvpRow } from '../types';

function getActionLabel(status: RecentRsvpRow['rsvpStatus']): string {
  switch (status) {
    case 'confirmed':
      return 'confirmed attendance';
    case 'declined':
      return 'declined the invitation';
    case 'pending':
      return 'updated their RSVP';
  }
}

function getStatusColor(status: RecentRsvpRow['rsvpStatus']): string {
  switch (status) {
    case 'confirmed':
      return 'bg-emerald-500';
    case 'declined':
      return 'bg-red-400';
    case 'pending':
      return 'bg-amber-400';
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function RecentRsvpActivityCard({
  activity,
  eventId,
}: {
  activity: RecentRsvpRow[];
  eventId: string;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Recent RSVP Activity</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        {activity.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No recent RSVP changes</p>
        ) : (
          activity.map((row) => (
            <div key={row.id} className="flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                  {getInitials(row.name)}
                </div>
                <div
                  className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${getStatusColor(row.rsvpStatus)}`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">
                  <span className="font-medium">{row.name}</span>
                  <span className="text-muted-foreground"> {getActionLabel(row.rsvpStatus)}</span>
                </p>
                {row.rsvpChangedByName && row.rsvpChangeSource === 'manual' && (
                  <p className="text-xs text-muted-foreground">via {row.rsvpChangedByName}</p>
                )}
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatRelativeTime(row.rsvpChangedAt)}
              </span>
            </div>
          ))
        )}
      </CardContent>
      <CardFooter className="pt-2">
        <Link
          href={`/app/${eventId}/guests`}
          className="text-xs text-primary underline-offset-4 hover:underline"
        >
          View all guests →
        </Link>
      </CardFooter>
    </Card>
  );
}
