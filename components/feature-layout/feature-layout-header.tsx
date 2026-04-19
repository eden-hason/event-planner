'use client';

import {
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useFeatureLayoutContext } from './feature-layout-context';

export function FeatureLayoutHeader() {
  const { title, description, action, containerClass } = useFeatureLayoutContext();

  if (!title) {
    return null;
  }

  return (
    <CardHeader className="pb-4">
      <div className={cn('flex w-full items-start justify-between gap-4', containerClass)}>
        <div className="grid gap-1.5">
          <CardTitle className="text-2xl font-bold">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </CardHeader>
  );
}
