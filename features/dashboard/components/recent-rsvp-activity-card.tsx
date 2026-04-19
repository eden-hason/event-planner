'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
} from '@/components/ui/item';
import { Button } from '@/components/ui/button';
import { cardHover } from '@/lib/utils';
import { IconCheck, IconX, IconClock } from '@tabler/icons-react';
import type { RecentRsvpRow } from '../types';

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
  const t = useTranslations('dashboard.recentActivity');

  function getActionLabel(status: RecentRsvpRow['rsvpStatus']): string {
    switch (status) {
      case 'confirmed': return t('confirmedAttendance');
      case 'declined': return t('declinedInvitation');
      case 'pending': return t('updatedRsvp');
    }
  }

  function formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return t('justNow');
    if (diffMins < 60) return t('minutesAgo', { count: diffMins });
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return t('hoursAgo', { count: diffHours });
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return diffDays === 1 ? t('dayAgo', { count: diffDays }) : t('daysAgo', { count: diffDays });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return (
    <Card className={`flex h-full flex-col gap-2 ${cardHover}`}>
      <CardHeader className="pb-2">
        <div>
          <div>
            <CardTitle className="text-sm font-semibold">
              {t('title')}
            </CardTitle>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {t('description')}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="max-h-72 overflow-y-auto p-0">
        {activity.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            {t('noActivity')}
          </p>
        ) : (
          activity.map((row) => (
            <Item key={row.id} size="sm">
              <ItemMedia>
                <StatusIcon status={row.rsvpStatus} />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{row.name}</ItemTitle>
                <ItemDescription>
                  {getActionLabel(row.rsvpStatus)}
                </ItemDescription>
              </ItemContent>
              <ItemActions className="text-muted-foreground self-start text-xs">
                <IconClock className="h-3 w-3 shrink-0" />
                <span>{formatRelativeTime(row.rsvpChangedAt)}</span>
              </ItemActions>
            </Item>
          ))
        )}
      </CardContent>
      <CardFooter className="pt-2">
        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link href={`/app/${eventId}/guests`}>{t('viewAllGuests')}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
