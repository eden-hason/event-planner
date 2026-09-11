'use client';

import { useTranslations } from 'next-intl';
import { ChevronLeft } from 'lucide-react';
import { Link, usePathname } from '@/i18n/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { useFeatureLayoutContext } from '@/components/feature-layout';
import { NotificationsMenu } from '@/components/layout/notifications-menu';
import { EventBillingStatusPill } from '@/features/billing';
import { SidebarToggleButton } from '@/components/layout/sidebar-toggle-button';
import { ThemeMenuButton } from '@/components/layout/theme-toggle';
import { cn } from '@/lib/utils';
import { isSeatingRoute } from './app-shell';
import { useMoreNavItems } from './more-nav-items';
import { buildNavUrl, getEventIdFromPathname } from './nav-urls';

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
 * width - but still gets the chrome row (stripped of its border), which is
 * where it hangs its title and its actions at every width so the workspace
 * below is nothing but workspace.
 */
export function PageCard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const seating = isSeatingRoute(pathname);
  const { title, subtitle, action } = useFeatureLayoutContext();
  const t = useTranslations('sidebar');
  const tNav = useTranslations('navigation');

  // Pages reached from the "More" tab (gifting, collaborate, seating) are not
  // in the bottom nav, so below `md` they would otherwise have no way back.
  // The list is the same one the tab bar and the More page render from.
  const eventId = getEventIdFromPathname(pathname);
  const moreItems = useMoreNavItems();
  const isMoreSubpage = moreItems.some((item) => {
    if (typeof item.href !== 'string') return false;
    const target = item.href.split(/[?#]/)[0];
    return pathname === target || pathname.startsWith(`${target}/`);
  });

  return (
    <Card
      className={cn(
        'rounded-none border-none bg-transparent shadow-none',
        seating
          ? 'min-h-0 flex-1 gap-4 p-0'
          : cn(
              // The same `gap-4` at every width, but it does two different
              // jobs: at `md` it is the room the card's header border needs,
              // and below it - where the row is a white band on the gray
              // shell - it is the gap that separates the band from the
              // content, with the row's own `pb-3` closing out the band.
              'gap-4',
              // Card's own default is `py-6` top and bottom; the chrome row
              // wants less air above it than CardContent wants below it, and
              // below `md` there's no bottom padding at all since nothing
              // needs the room without the border/background.
              // No top padding below `md` either - the chrome row owns its own
              // there, so its white band reaches the top edge of the viewport
              // instead of leaving a strip of the gray shell above it.
              'pt-0 pb-0 md:pt-3 md:pb-6',
              // Clearance above the fixed `MobileBottomNav`, at every width
              // below `md` - the card frame is gone there, but the nav still
              // sits over the bottom of the viewport. The nav publishes its own
              // height as `--app-bottom-nav-height`; it adds the device
              // safe-area inset below itself, so the gap has to clear both.
              'mb-[calc(var(--app-bottom-nav-height)+env(safe-area-inset-bottom))] md:mb-2',
              // `mt-2`/`me-2` (8px), matching the floating sidebar's own
              // outer gap so the two sit level. `me-2` (not `mx-2`): the
              // sidebar-facing side already gets its 8px from the sidebar's
              // own `p-2` inset, so only the far edge needs its own margin -
              // logical, so it lands on the right in LTR and the left in
              // RTL.
              'md:me-2 md:mt-2 md:min-h-[calc(100svh-1rem)]',
              'md:bg-card md:rounded-xl md:border md:shadow-sm',
            ),
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between gap-4',
          seating
            ? cn(
                // Below `md` the Seating Plan gets the same white band as every
                // other page - it hands its title and its actions to this row
                // rather than keeping a header of its own (see `SeatingPage`).
                'bg-card px-4 pt-4 pb-3',
                // From `md` up the workspace is full-bleed again, so the row
                // loses the band but keeps the title: it is the page's only
                // header there too. `px-6` lines the title and its actions up
                // with the workspace below rather than with the card edge; the
                // Card's own `gap-4` closes the row out, so no bottom padding.
                'md:bg-transparent md:px-6 md:pt-3 md:pb-0',
              )
            : cn(
                'px-4 pb-3 md:border-b md:px-6',
                // Below `md` the card frame is gone and the page sits straight
                // on the gray shell, so the row needs its own surface to read
                // as a header rather than as the first line of the content.
                // `bg-card`, not `bg-white`: it is the same white the card uses
                // at `md` and up, and it follows the theme into dark mode.
                // The top padding lives here rather than on the Card so the
                // band covers it (see the Card's `pt-0` below `md`).
                'bg-card pt-4 md:bg-transparent md:pt-0',
              ),
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          {/*
            Toggles the sidebar - `md` and up only. Below `md` navigation is the
            bottom nav and the More page, so the sidebar has no opener there and
            this side of the header holds just the page title (with a back arrow
            on the pages reached from More).
          */}
          <SidebarToggleButton className="hidden md:flex" />
          {isMoreSubpage && (
            <Link
              href={buildNavUrl('/app/more', eventId)}
              aria-label={tNav('back')}
              className="text-muted-foreground hover:bg-accent hover:text-accent-foreground -ms-1 flex size-8 shrink-0 items-center justify-center rounded-md transition-colors md:hidden"
            >
              <ChevronLeft className="size-5 rtl:rotate-180" />
            </Link>
          )}
          <div className="flex min-w-0 flex-col gap-0.5">
            {title && <h1 className="truncate text-xl font-semibold">{title}</h1>}
            {subtitle && (
              <span className="text-muted-foreground truncate text-xs">{subtitle}</span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {action}
          {/*
            The account-status pill (see `@/features/billing`), the theme menu,
            and notifications - `md` and up only. Below `md` the phone header
            has room for the page's own action and little else: the theme menu
            and notifications move into the sidebar footer (see `AppSidebar`);
            the status pill drops entirely.
          */}
          <div className="hidden items-center gap-2 md:flex">
            <EventBillingStatusPill />
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
