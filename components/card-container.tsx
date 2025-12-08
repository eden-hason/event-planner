'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { startCase } from 'lodash';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

interface CardContainerProps {
  children: ReactNode;
  className?: string;
}

function formatPathToTitle(pathname: string): string {
  const segments = pathname.slice(1).split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1] || 'home';
  return startCase(lastSegment);
}

export function CardContainer({ children, className }: CardContainerProps) {
  const pathName = usePathname();
  const title = formatPathToTitle(pathName);

  return (
    <Card className={cn('border-none p-0 shadow-none', className)}>
      <CardHeader>
        <CardTitle className="text-xl font-bold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">{children}</CardContent>
    </Card>
  );
}
