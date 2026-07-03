import { cn } from '@/lib/utils';
import { IconStar, IconArmchair2 } from '@tabler/icons-react';
import { ROLE_LABELS, type CollaboratorRole } from '../schemas';

interface RoleBadgeProps {
  role: CollaboratorRole;
  isCreator?: boolean;
  className?: string;
}

export function RoleBadge({ role, isCreator, className }: RoleBadgeProps) {
  if (role === 'owner' && isCreator) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700',
          className,
        )}
      >
        <IconStar className="h-3 w-3 fill-amber-400 text-amber-400" />
        Owner &middot; Creator
      </span>
    );
  }

  if (role === 'owner') {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600',
          className,
        )}
      >
        {ROLE_LABELS[role]}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600',
        className,
      )}
    >
      <IconArmchair2 className="h-3 w-3" />
      {ROLE_LABELS[role]}
    </span>
  );
}
