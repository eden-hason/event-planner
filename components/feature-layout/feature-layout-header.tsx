'use client';

import {
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useFeatureLayoutContext } from './feature-layout-context';

export function FeatureLayoutHeader() {
  const { title, description, action } = useFeatureLayoutContext();

  // Don't render header if no title is set
  if (!title) {
    return null;
  }

  return (
    <CardHeader>
      <CardTitle className="text-2xl font-bold">{title}</CardTitle>
      {description && <CardDescription>{description}</CardDescription>}
      {action && <CardAction>{action}</CardAction>}
    </CardHeader>
  );
}
