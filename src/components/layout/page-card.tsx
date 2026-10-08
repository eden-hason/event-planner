'use client';

import { useTranslations } from 'next-intl';
import { ChevronLeft, X } from 'lucide-react';
import { Link, usePathname } from '@/i18n/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { useFeatureLayoutContext } from '@/components/feature-layout';
import { NotificationsMenu } from '@/components/layout/notifications-menu';
import { EventBillingStatusPill } from '@/features/billing';
import { SidebarToggleButton } from '@/components/layout/sidebar-toggle-button';
import { ThemeMenuButton } from '@/components/layout/theme-toggle';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { usePublishedHeight } from '@/hooks/use-published-height';
import { isSeatingRoute, isGuestImportRoute, isHomeRoute } from './app-shell';
import { useBottomNavHidden } from './bottom-nav-context';
import { useMoreNavItems } from './more-nav-items';
import { buildNavUrl, getEventIdFromPathname } from './nav-urls';

/**
 * Lays out every event page's content straight on the `AppShell` background,
 * beside the solid sidebar (the Guests Desktop shell) - no card frame at any
 * width. Pages put their own white cards on that surface where they want
 * one; anything pinned that sits on the page itself (a toolbar, a save bar)
 * paints `bg-app-shell` from `md` up so it matches what scrolls beneath it.
 *
 * Its top row carries the page title alongside the controls that stand in
 * for the app-wide header that used to run across the top of the whole shell
 * - sidebar toggle and notifications - since there is no header anymore and
 * this row is the only place left to reach them (the user menu lives in the
 * sidebar footer instead).
 *
 * Below `md` the row has no surface of its own: the title sits straight on
 * the page, larger, and once it scrolls away a compact bar - one line on a
 * blurred wash of the page - pins to the top so the title stays in view
 * without clashing with the cards passing under it.
 *
 * The Seating Plan keeps the flat, full-bleed treatment at every size - a
 * work surface, not a page, so a card frame would eat into the canvas at any
 * width - but still gets the chrome row (stripped of its border), which is
 * where it hangs its title and its actions at every width so the workspace
 * below is nothing but workspace.
 */
export function PageCard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const bottomNavHidden = useBottomNavHidden();
  const seating = isSeatingRoute(pathname);
  // Home's mobile Hero is its own header: it opens with the event title and the
  // countdown against a full-bleed wash that has to start at the top edge of
  // the viewport, which a white chrome band above it would cut off. The row
  // stays from `md` up, where Home is the desktop layout and the Hero is one
  // card in a grid rather than the top of the page.
  const hideChromeRowOnMobile = isHomeRoute(pathname);
  const { title, subtitle, action, back, sticky } = useFeatureLayoutContext();
  const headerRef = useRef<HTMLDivElement>(null);
  const pinned = sticky && !seating;
  usePublishedHeight(headerRef, '--page-header-h', pinned);
  // The Seating Plan never scrolls the page, and Home has no row to scroll
  // away below `md`, so neither needs the compact bar.
  const compactBar = !seating && !hideChromeRowOnMobile;
  const scrolledPast = useScrolledPast(headerRef, compactBar);
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

  // The guest-import wizard draws its own header (back arrow, step title,
  // progress bar) and its own sticky footer - it wants the full viewport with
  // none of this card's chrome, not a variant of it the way the Seating Plan
  // below still takes the chrome row for its title and actions. Checked after
  // every hook above runs, so this early return can't shift their order
  // between renders.
  if (isGuestImportRoute(pathname)) {
    return <div className="flex min-h-0 flex-1 flex-col">{children}</div>;
  }

  return (
    <Card
      className={cn(
        'rounded-none border-none bg-transparent shadow-none',
        seating
          ? 'min-h-0 flex-1 gap-4 p-0'
          : cn(
              // The space between the header row and the content: nearly all
              // of it below `md`, where the row keeps only a sliver of bottom
              // padding, and all of it from `md` up.
              'gap-4 md:gap-3',
              // Card's own default is `py-6` top and bottom; the chrome row
              // wants less air above it than CardContent wants below it, and
              // below `md` there's no bottom padding at all.
              // No top padding below `md` either - the chrome row owns its own
              // there.
              'pt-0 pb-0 md:pt-3 md:pb-6',
              // Clearance above the fixed `MobileBottomNav`, at every width
              // below `md` - the card frame is gone there, but the nav still
              // sits over the bottom of the viewport. The nav publishes its own
              // height as `--app-bottom-nav-height`; it adds the device
              // safe-area inset below itself, so the gap has to clear both.
              // A page that hides the nav (see `useHideBottomNav`) needs no
              // clearance for it.
              bottomNavHidden
                ? 'mb-0'
                : 'mb-[calc(var(--app-bottom-nav-height)+env(safe-area-inset-bottom))] md:mb-0',
              'md:min-h-svh',
              pinned && 'md:pt-0',
            ),
      )}
    >
      <div
        ref={headerRef}
        className={cn(
          'flex items-center justify-between gap-4',
          // From `md` up the row is as tall as a title with a subtitle (28px +
          // 16px line heights), so moving between pages with and without one
          // does not grow or shrink the header and shift the content below it.
          'md:min-h-11',
          // `hidden`, not just an unpainted band: gone from the flex flow, the
          // Card's `gap-4` goes with it and the content starts at y=0.
          hideChromeRowOnMobile && 'hidden md:flex',
          seating
            ? cn(
                // Below `md` the Seating Plan gets the same row as every other
                // page - it hands its title and its actions to this row rather
                // than keeping a header of its own (see `SeatingPage`).
                'px-4 pt-5 pb-0.5',
                // From `md` up the row keeps the title: it is the page's only
                // header there too. `px-6` lines the title and its actions up
                // with the workspace below rather than with the card edge; the
                // Card's own `gap-4` closes the row out, so no bottom padding.
                'md:px-6 md:pt-3 md:pb-0',
              )
            : // Below `md` there is no band behind the row: the title sits on
              // the page, with more air above it. The top padding lives here
              // rather than on the Card (see the Card's `pt-0` below `md`).
              'px-4 pt-5 pb-0.5 md:px-6 md:pt-0 md:pb-0',
          // A page that asked for it keeps this row in view (see `sticky` in
          // the feature layout context), and its own sticky controls stack
          // under it. The Card's top padding moves in here, so the row's
          // surface covers it and nothing shows through above the title.
          pinned &&
            'md:bg-app-shell md:sticky md:top-0 md:z-30 md:pt-3',
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
          {title && <span aria-hidden className="bg-border hidden h-[18px] w-px md:block" />}
          {isMoreSubpage && (
            <Link
              href={buildNavUrl('/app/more', eventId)}
              aria-label={tNav('back')}
              className="text-muted-foreground hover:bg-accent hover:text-accent-foreground -ms-1 flex size-8 shrink-0 items-center justify-center rounded-md transition-colors md:hidden"
            >
              <ChevronLeft className="size-5 rtl:rotate-180" />
            </Link>
          )}
          {back && (
            <button
              type="button"
              onClick={back.onClick}
              aria-label={back.label}
              className="text-muted-foreground hover:bg-accent hover:text-accent-foreground -ms-1 flex size-8 shrink-0 items-center justify-center rounded-md transition-colors"
            >
              {back.icon === 'close' ? (
                <X className="size-5" />
              ) : (
                <ChevronLeft className="size-5 rtl:rotate-180" />
              )}
            </button>
          )}
          {title && (
            <div className="flex min-w-0 flex-col gap-0.5 md:block">
              {/*
                With no band behind it the title carries the header on its
                own, so below `md` it is bigger and heavier.
              */}
              <h1 className="truncate text-2xl leading-[1.15] font-extrabold md:text-xl md:leading-7 md:font-semibold">
                {title}
              </h1>
              {subtitle && (
                <p className="text-muted-foreground truncate text-[13px] md:text-xs">
                  {subtitle}
                </p>
              )}
            </div>
          )}
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
      {compactBar && (
        <div
          aria-hidden={!scrolledPast}
          inert={!scrolledPast}
          className={cn(
            'bg-app-shell/80 border-border/60 fixed inset-x-0 top-0 z-30 flex items-center justify-between gap-2.5 border-b px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 backdrop-blur-[14px] transition-opacity duration-200 md:hidden',
            scrolledPast ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            {isMoreSubpage && (
              <Link
                href={buildNavUrl('/app/more', eventId)}
                aria-label={tNav('back')}
                className="text-muted-foreground -ms-1 flex size-7 shrink-0 items-center justify-center rounded-md"
              >
                <ChevronLeft className="size-5 rtl:rotate-180" />
              </Link>
            )}
            {back && (
              <button
                type="button"
                onClick={back.onClick}
                aria-label={back.label}
                className="text-muted-foreground -ms-1 flex size-7 shrink-0 items-center justify-center rounded-md"
              >
                {back.icon === 'close' ? (
                  <X className="size-5" />
                ) : (
                  <ChevronLeft className="size-5 rtl:rotate-180" />
                )}
              </button>
            )}
            {/* The `h1` above still names the page; this is its echo. */}
            <span
              aria-hidden
              className="min-w-0 truncate text-base font-extrabold"
            >
              {title}
            </span>
          </div>
          {action && (
            <div className="flex shrink-0 items-center gap-2">{action}</div>
          )}
        </div>
      )}
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

/**
 * Whether the element has scrolled up out of the viewport - below the top
 * edge does not count. Off when `enabled` is false.
 */
function useScrolledPast(
  ref: React.RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  const [past, setPast] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) {
      setPast(false);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      setPast(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, enabled]);

  return past;
}
