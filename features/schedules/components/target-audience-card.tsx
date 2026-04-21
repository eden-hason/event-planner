import { getTranslations } from 'next-intl/server';
import { IconUsers } from '@tabler/icons-react';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { type GuestStats } from '../schemas';

interface TargetAudienceCardProps {
  targetStatus?: 'pending' | 'confirmed' | null;
  guestStats: GuestStats;
}

export async function TargetAudienceCard({ targetStatus, guestStats }: TargetAudienceCardProps) {
  const t = await getTranslations('schedules.audience');

  const audienceLabel =
    targetStatus === 'confirmed'
      ? t('confirmedGuests')
      : targetStatus === 'pending'
        ? t('pendingGuests')
        : t('allGuests');

  const badgeClass =
    targetStatus === 'confirmed'
      ? 'bg-green-100 text-green-800 border-green-200'
      : targetStatus === 'pending'
        ? 'bg-amber-100 text-amber-800 border-amber-200'
        : '';

  const targetCount =
    targetStatus === 'confirmed'
      ? guestStats.confirmed
      : targetStatus === 'pending'
        ? guestStats.pending
        : guestStats.total;

  const isFiltered = targetStatus != null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="rounded-md bg-primary/10 p-1.5">
            <IconUsers size={16} className="text-primary" />
          </div>
          {t('cardTitle')}
        </CardTitle>
        <CardAction>
          <Badge variant="secondary" className={badgeClass}>
            {audienceLabel}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tabular-nums leading-none">
              {targetCount}
            </span>
            <span className="text-sm text-muted-foreground">
              {t('guestsWillReceive')}
            </span>
          </div>

          {isFiltered && (
            <p className="text-xs text-muted-foreground">
              {t('outOfTotal', { total: guestStats.total })}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
