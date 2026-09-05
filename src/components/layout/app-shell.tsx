'use client';

import { usePathname } from 'next/navigation';
import { SidebarProvider } from '@/components/ui/sidebar';

/**
 * Routes that opt out of the default full-bleed layout.
 *
 * Exported so `LayoutContentWrapper` tests the same thing this does: the
 * Seating Plan is a work surface rather than a page, so it fills the
 * viewport instead of getting the usual padded content column.
 */
export function isSeatingRoute(pathname: string) {
  return pathname.includes('/seating');
}

/**
 * A dedicated `--app-shell` token, not `bg-muted`/`bg-background`: the
 * sidebar (`variant="floating"`) and the page's content `Card` are both
 * white, and only read as floating panels if the canvas behind them is a
 * different shade - `--muted` would also tint every other neutral surface
 * that borrows it.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider className="bg-app-shell min-h-svh flex-col">
      {children}
    </SidebarProvider>
  );
}

/**
 * Renders its children everywhere except the Seating Plan.
 *
 * The workspace fills the viewport and puts its own controls in both bottom
 * corners, so a floating launcher lands on top of them rather than beside them.
 */
export function HiddenOnSeatingPlan({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return isSeatingRoute(pathname) ? null : <>{children}</>;
}
