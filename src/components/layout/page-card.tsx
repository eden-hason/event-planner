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
import { useLayoutEffect, useRef } from 'react';
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
 * the page, larger. As the page scrolls the row collapses into a compact bar
 * pinned to the top - the title shrinks into one line and a blurred wash of
 * the page fades in behind it - so the title stays in view without clashing
 * with the cards passing under it. See `useCollapsingHeader`.
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
  // The Seating Plan never scrolls the page, and Home has no row below `md`,
  // so neither collapses.
  const collapsing = !seating && !hideChromeRowOnMobile;
  useCollapsingHeader(headerRef, collapsing);
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
          // Below `md` the row pins with only its last `COLLAPSED_HEIGHT`
          // pixels in view; everything in it slides down into that strip.
          collapsing &&
            'isolate max-md:sticky max-md:top-[var(--collapse-top,0px)] max-md:z-30',
        )}
      >
        {collapsing && (
          // The compact bar's surface. It covers whatever is left of the row
          // in view - the whole row at rest, the strip once pinned - and fades
          // in as it shrinks. Only its opacity moves, never the blur radius,
          // which is costly to animate.
          <div
            aria-hidden
            className="bg-app-shell/80 border-border/60 pointer-events-none absolute inset-x-0 top-[calc(var(--collapse,0)*var(--collapse-dist,0px))] bottom-0 -z-10 border-b [opacity:var(--collapse,0)] backdrop-blur-[14px] md:hidden"
          />
        )}
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
              data-collapse=""
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
              data-collapse=""
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
            <div
              data-collapse="title"
              className="flex min-w-0 flex-col gap-0.5 md:block"
            >
              {/*
                With no band behind it the title carries the header on its
                own, so below `md` it is bigger and heavier - and shrinks back
                to 16px as the row collapses.
              */}
              <h1 className="truncate text-2xl leading-[1.15] font-extrabold ltr:origin-left rtl:origin-right [scale:calc(1_-_var(--collapse,0)/3)] md:text-xl md:leading-7 md:font-semibold">
                {title}
              </h1>
              {subtitle && (
                // Gone by the time the row is halfway collapsed.
                <p className="text-muted-foreground truncate text-[13px] [opacity:calc(1_-_var(--collapse,0)*2)] md:text-xs">
                  {subtitle}
                </p>
              )}
            </div>
          )}
        </div>
        <div data-collapse="" className="flex shrink-0 items-center gap-2">
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

/** The height of the collapsed row: one 16px line with 12px above and below. */
const COLLAPSED_HEIGHT = 48;
/** Scroll that runs a collapse with almost no height to lose, so it still eases. */
const MIN_COLLAPSE_SCROLL = 32;

/**
 * Collapses the chrome row into a compact bar as the page scrolls, below `md`.
 *
 * The row is sticky with a negative `top`, so it scrolls until only its last
 * `COLLAPSED_HEIGHT` pixels are in view and pins there - nothing in the flow
 * changes height, so the content below never jumps. Scroll progress from 0
 * to 1 goes into `--collapse`, and the CSS does the rest: each
 * `[data-collapse]` element slides by `--dy` into the strip, the title
 * scales down, the subtitle fades and the bar's surface fades in. It tracks
 * the scroll itself rather than playing a timed animation, so it follows the
 * finger both ways and stops wherever the scroll stops.
 */
function useCollapsingHeader(
  ref: React.RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  useLayoutEffect(() => {
    const row = ref.current;
    if (!row || !enabled) return;
    const mobile = window.matchMedia('(max-width: 767px)');
    let distance = 0;
    let frame = 0;

    const movers = () =>
      row.querySelectorAll<HTMLElement>('[data-collapse]');

    const clear = () => {
      for (const name of ['--collapse', '--collapse-top', '--collapse-dist']) {
        row.style.removeProperty(name);
      }
      for (const el of movers()) {
        el.style.removeProperty('translate');
      }
    };

    const update = () => {
      frame = 0;
      const progress = Math.min(
        1,
        Math.max(0, window.scrollY / Math.max(distance, MIN_COLLAPSE_SCROLL)),
      );
      row.style.setProperty('--collapse', String(progress));
    };

    // Where everything has to end up depends on the row's height and on
    // what is in it, so it is measured again whenever either changes. It
    // reads the resting layout - collapse and shifts reset, all within one
    // frame, so nothing flickers - since a shifted element's own position
    // would be off by however far it has already moved.
    const measure = () => {
      clear();
      if (!mobile.matches) return;
      const rowTop = row.getBoundingClientRect().top;
      const height = row.offsetHeight;
      distance = Math.max(0, height - COLLAPSED_HEIGHT);
      row.style.setProperty('--collapse-top', `${-distance}px`);
      row.style.setProperty('--collapse-dist', `${distance}px`);
      const center = height - COLLAPSED_HEIGHT / 2;
      const shifts = Array.from(movers(), (el) => {
        // The title block lines up on its `h1`, not on its own middle: the
        // subtitle under it is fading out.
        const anchor =
          el.dataset.collapse === 'title'
            ? (el.querySelector('h1') ?? el)
            : el;
        const box = anchor.getBoundingClientRect();
        return [el, center - (box.top - rowTop + box.height / 2)] as const;
      });
      for (const [el, dy] of shifts) {
        el.style.setProperty(
          'translate',
          `0 calc(var(--collapse, 0) * ${dy}px)`,
        );
      }
      update();
    };

    const onScroll = () => {
      if (mobile.matches && !frame) frame = requestAnimationFrame(update);
    };

    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(row);
    const mutation = new MutationObserver(measure);
    mutation.observe(row, { childList: true, subtree: true });
    mobile.addEventListener('change', measure);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutation.disconnect();
      mobile.removeEventListener('change', measure);
      window.removeEventListener('scroll', onScroll);
      clear();
    };
  }, [ref, enabled]);
}
