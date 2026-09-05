'use client';

import { usePathname } from 'next/navigation';
import { isSeatingRoute } from './app-shell';

export function LayoutContentWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSeatingPage = isSeatingRoute(pathname);

  if (isSeatingPage) {
    return <>{children}</>;
  }

  // No padding here - the spacing around the main card is the card's own
  // margin (see `PageCard`), not this wrapper's. It still owns the `2xl`
  // centering, which is a container-width concern, not a card-edge one.
  return (
    <div className="flex-1">
      <div className="2xl:container mx-auto h-full">{children}</div>
    </div>
  );
}
