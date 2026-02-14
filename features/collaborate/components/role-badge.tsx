import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ROLE_LABELS, type CollaboratorRole } from '../schemas';

interface RoleBadgeProps {
  role: CollaboratorRole;
  isCreator?: boolean;
  className?: string;
}

export function RoleBadge({ role, isCreator, className }: RoleBadgeProps) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <Badge
        variant={role === 'owner' ? 'default' : 'secondary'}
        className="text-xs"
      >
        {ROLE_LABELS[role]}
      </Badge>
      {isCreator && (
        <Badge variant="outline" className="text-muted-foreground text-xs">
          Creator
        </Badge>
      )}
    </div>
  );
}
