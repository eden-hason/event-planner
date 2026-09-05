'use client';

import { useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { useFeatureLayoutContext } from '@/components/feature-layout';
import { NotificationsMenu } from '@/components/layout/notifications-menu';
import { SidebarToggleButton } from '@/components/layout/sidebar-toggle-button';
import { ThemeMenuButton } from '@/components/layout/theme-toggle';
import { cn } from '@/lib/utils';
import { isSeatingRoute } from './app-shell';

/**
 * Wraps every event page's content in a floating white card on the gray
 * `AppShell` background - but only from `md` up. Below that the card frame,
 * its margin, and its border all disappear and the page goes edge-to-edge:
 * a floating box with its own gutter reads fine next to a sidebar, but on a
 * phone the sidebar is an off-canvas drawer, not something the card needs to
 * visually sit beside, and the box just eats width the page needs. This is a
 * CSS breakpoint, not `useIsMobile()`, so it paints correctly on first
 * render instead of flashing the desktop card before JS measures the
 * viewport.
 *
 * Its top row carries the page title alongside the controls that stand in
 * for the app-wide header that used to run across the top of the whole shell
 * - sidebar toggle and notifications - since there is no header anymore and
 * this row is the only place left to reach them (the user menu lives in the
 * sidebar footer instead).
 *
 * The Seating Plan keeps the flat, full-bleed treatment at every size - a
 * work surface, not a page, so a card frame would eat into the canvas at any
 * width - but still gets the chrome row (stripped of its own padding/border,
 * and it never sets a title), since it would otherwise be the one route with
 * no way to collapse the sidebar.
 */
export function PageCard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const seating = isSeatingRoute(pathname);
  const { title, action } = useFeatureLayoutContext();
  const t = useTranslations('sidebar');

  return (
    <Card
      className={cn(
        'rounded-none border-none bg-transparent shadow-none',
        seating
          ? 'gap-4 min-h-0 flex-1 p-0'
          : cn(
              // `gap-0`, not `gap-4`: below `md` the chrome row's own `pb-3`
              // is the only header-to-content spacing there should be: the
              // flex gap on top of that padding was doubling it up. Restored
              // at `md` since the border there needs the room back.
              'gap-0 md:gap-4',
              // Card's own default is `py-6` top and bottom; the chrome row
              // wants less air above it than CardContent wants below it, and
              // below `md` there's no bottom padding at all since nothing
              // needs the room without the border/background.
              'pt-4 pb-0 md:pt-3 md:pb-6',
              // Clearance above the fixed `MobileBottomNav`, at every width
              // below `md` - the card frame is gone there, but the nav still
              // floats over the bottom of the viewport.
              'mb-24 md:mb-2',
              // `mt-2`/`me-2` (8px), matching the floating sidebar's own
              // outer gap so the two sit level. `me-2` (not `mx-2`): the
              // sidebar-facing side already gets its 8px from the sidebar's
              // own `p-2` inset, so only the far edge needs its own margin -
              // logical, so it lands on the right in LTR and the left in
              // RTL.
              'md:min-h-[calc(100svh-1rem)] md:mt-2 md:me-2',
              'md:rounded-xl md:border md:bg-card md:shadow-sm',
            ),
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between gap-4',
          seating ? 'px-2 pb-1' : 'px-4 pb-3 md:border-b md:px-6',
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <SidebarToggleButton />
          {title && (
            <h1 className="truncate text-xl font-semibold">{title}</h1>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {action}
          <ThemeMenuButton
            labels={{
              theme: t('theme'),
              light: t('themeLight'),
              dark: t('themeDark'),
              system: t('themeSystem'),
            }}
          />
          <NotificationsMenu />
        </div>
      </div>
      <CardContent
        className={cn(
          'space-y-6',
          seating ? 'flex min-h-0 flex-1 flex-col p-0' : 'px-4 md:px-6',
        )}
      >
        {children}
      </CardContent>
    </Card>
  );
}
