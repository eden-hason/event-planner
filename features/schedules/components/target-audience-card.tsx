import { Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface TargetAudienceCardProps {
  targetStatus?: 'pending' | 'confirmed' | null;
}

export function TargetAudienceCard({ targetStatus }: TargetAudienceCardProps) {
  const config =
    targetStatus === 'confirmed'
      ? {
          label: 'Confirmed Guests',
          description: 'Only guests who have confirmed their attendance.',
          className: 'bg-green-100 text-green-800 border-green-200',
        }
      : targetStatus === 'pending'
        ? {
            label: 'Pending Guests',
            description: 'Only guests who have not yet responded.',
            className: 'bg-amber-100 text-amber-800 border-amber-200',
          }
        : {
            label: 'All Guests',
            description: 'All guests on the guest list will receive this message.',
            className: '',
          };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Target Audience
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          <Badge variant="secondary" className={`w-fit ${config.className}`}>
            {config.label}
          </Badge>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
