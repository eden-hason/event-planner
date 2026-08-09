import { getTranslations } from 'next-intl/server';
import { IconUsers, IconUserCheck, IconClock } from '@tabler/icons-react';

import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface TargetAudienceCardProps {
  targetStatus?: 'pending' | 'confirmed' | null;
  disabled?: boolean;
}

export async function TargetAudienceCard({ targetStatus, disabled }: TargetAudienceCardProps) {
  const t = await getTranslations('schedules.audience');

  const audienceLabel =
    targetStatus === 'confirmed'
      ? t('confirmedGuests')
      : targetStatus === 'pending'
        ? t('pendingGuests')
        : t('allGuests');

  const AudienceIcon =
    targetStatus === 'confirmed' ? IconUserCheck : targetStatus === 'pending' ? IconClock : IconUsers;

  const statusClass =
    targetStatus === 'confirmed'
      ? 'bg-green-100 text-green-800'
      : targetStatus === 'pending'
        ? 'bg-amber-100 text-amber-800'
        : 'bg-primary/10 text-primary';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="rounded-md bg-primary/10 p-1.5">
            <IconUsers size={16} className="text-primary" />
          </div>
          {t('cardTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {disabled ? (
          <p className="text-xs text-muted-foreground">{t('disabledNote')}</p>
        ) : (
          <div
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium w-fit',
              statusClass,
            )}
          >
            <AudienceIcon size={16} />
            {audienceLabel}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
