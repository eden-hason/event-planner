'use client';

import { usePathname } from 'next/navigation';
import { SidebarProvider } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

/**
 * Routes that opt out of the shell gradient.
 *
 * Exported so `LayoutContentWrapper` tests the same thing this does; the two
 * decisions are one decision - full-bleed layout and a flat backdrop - and
 * splitting the predicate is how they drift apart.
 */
export function isSeatingRoute(pathname: string) {
  return pathname.includes('/seating');
}

/**
 * The app shell.
 *
 * Every route gets the tinted gradient except the Seating Plan, which is a work
 * surface rather than a page: the canvas is a dotted arrangement field, and a
 * colour wash behind it competes with the tables for attention. It gets a flat
 * `--muted` gray instead, which stays theme-aware where the gradient's two
 * hardcoded hex stops do not.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <SidebarProvider
      className={cn(
        'min-h-svh flex-col',
        isSeatingRoute(pathname) ? 'bg-muted' : 'app-shell-gradient',
      )}
    >
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
