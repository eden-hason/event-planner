'use client';

import { usePathname } from 'next/navigation';

export function LayoutContentWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSeatingPage = pathname.includes('/seating');

  if (isSeatingPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex-1 px-4 py-4">
      <div className="container mx-auto h-full">{children}</div>
    </div>
  );
}
