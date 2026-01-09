'use client';

import { useRef, useState, useEffect } from 'react';
import {
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useFeatureLayoutContext } from './feature-layout-context';

export function FeatureLayoutHeader() {
  const { title, description, action } = useFeatureLayoutContext();
  const headerRef = useRef<HTMLDivElement>(null);
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // When the header is intersecting at less than 100%, it means it's stuck
        setIsStuck(entry.intersectionRatio < 1);
      },
      {
        threshold: [1],
        rootMargin: '-1px 0px 0px 0px',
      },
    );

    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  // Don't render header if no title is set
  if (!title) {
    return null;
  }

  return (
    <CardHeader
      ref={headerRef}
      className={cn(
        'sticky -top-px z-10 pb-4 transition-all duration-200',
        isStuck && 'bg-[#F4F4F6] pt-4 shadow-sm',
      )}
    >
      <CardTitle className="text-2xl font-bold">{title}</CardTitle>
      {description && <CardDescription>{description}</CardDescription>}
      {action && <CardAction>{action}</CardAction>}
    </CardHeader>
  );
}
