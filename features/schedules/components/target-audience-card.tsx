import { Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { type GuestStats } from '../schemas';

interface TargetAudienceCardProps {
  targetStatus?: 'pending' | 'confirmed' | null;
  guestStats: GuestStats;
}

export function TargetAudienceCard({ targetStatus, guestStats }: TargetAudienceCardProps) {
  const config =
    targetStatus === 'confirmed'
      ? {
          label: 'Confirmed Guests',
          className: 'bg-green-100 text-green-800 border-green-200',
        }
      : targetStatus === 'pending'
        ? {
            label: 'Pending Guests',
            className: 'bg-amber-100 text-amber-800 border-amber-200',
          }
        : {
            label: 'All Guests',
            className: '',
          };

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
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="rounded-md bg-primary/10 p-1.5">
              <Users className="h-4 w-4 text-primary" />
            </div>
            Target Audience
          </CardTitle>
          <Badge variant="secondary" className={config.className}>
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tabular-nums leading-none">
              {targetCount}
            </span>
            <span className="text-sm text-muted-foreground">
              guests will receive this message
            </span>
          </div>

          {isFiltered && (
            <p className="text-xs text-muted-foreground">
              out of {guestStats.total} total guests
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
