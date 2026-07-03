import { Badge } from '@/components/ui/badge';
import { formatScopeSummary } from '../utils';

interface ScopeSummaryProps {
  groupCount: number;
  guestCount: number;
}

export function ScopeSummary({ groupCount, guestCount }: ScopeSummaryProps) {
  const text = formatScopeSummary(groupCount, guestCount);

  return (
    <Badge variant="outline" className="text-muted-foreground text-xs">
      {text}
    </Badge>
  );
}
