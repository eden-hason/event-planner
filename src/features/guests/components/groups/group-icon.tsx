'use client';

import * as TablerIcons from '@tabler/icons-react';
import { cn } from '@/lib/utils';

// Legacy icon map for group icons stored as 'LucideBeer' in the database
const LegacyIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  LucideBeer: TablerIcons.IconBeer,
};

type GroupIconSize = 'sm' | 'md' | 'lg';

const sizeClasses: Record<GroupIconSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

interface GroupIconProps {
  iconName: string | null | undefined;
  size?: GroupIconSize;
  className?: string;
}

export function GroupIcon({ iconName, size = 'md', className }: GroupIconProps) {
  if (!iconName) return null;

  const isLucideIcon = iconName.startsWith('Lucide');
  const iconClassName = cn(sizeClasses[size], className);

  if (isLucideIcon) {
    const LegacyIcon = LegacyIcons[iconName];
    return LegacyIcon ? <LegacyIcon className={iconClassName} /> : null;
  }

  const TablerIcon = TablerIcons[
    iconName as keyof typeof TablerIcons
  ] as React.ComponentType<{ className?: string }>;

  return TablerIcon ? <TablerIcon className={iconClassName} /> : null;
}

