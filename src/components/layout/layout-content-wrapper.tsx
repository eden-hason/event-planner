'use client';

import { usePathname } from 'next/navigation';
import { isSeatingRoute } from './app-shell';

export function LayoutContentWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSeatingPage = isSeatingRoute(pathname);

  if (isSeatingPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex-1 px-4 py-4 pb-24 md:pb-4">
      <div className="2xl:container mx-auto h-full">{children}</div>
    </div>
  );
}
