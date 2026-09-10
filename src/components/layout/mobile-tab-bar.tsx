'use client';

import { useState, type ComponentProps, type ElementType } from 'react';

import { useVisualViewportOffset } from '@/hooks/use-visual-viewport-offset';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export type MobileTabBarHref = ComponentProps<typeof Link>['href'];

type NavHref = MobileTabBarHref;

// Tabler icons carry an invisible `<path fill="none">` bounding box, and a plain
// `fill-current` would paint it solid because CSS outranks that attribute. Filling
// only the shapes that do not opt out keeps both icon sets looking right.
const FILL_ACTIVE_ICON = '[&_:not([fill=none])]:fill-current';

export type MobileTabBarItem = {
  /** Stable id for the tab, used to track and report the active one. */
  value: string;
  label: string;
  icon: ElementType;
  /** Filled variant rendered while the tab is active. Falls back to `icon`. */
  activeIcon?: ElementType;
  /** Renders the tab as a link. Omit it for tabs that only run `onClick`. */
  href?: NavHref;
  onClick?: () => void;
  /** `true` shows a plain dot, a number or string shows a count pill. */
  badge?: number | string | boolean;
  disabled?: boolean;
};

type MobileTabBarProps = {
  items: MobileTabBarItem[];
  /** Controlled active tab. Leave it out to derive the active tab from the route. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  showLabels?: boolean;
  className?: string;
  'aria-label'?: string;
};

function toPathname(href: NavHref | undefined): string | null {
  if (typeof href === 'string') return href.split(/[?#]/)[0];
  if (href && typeof href === 'object' && typeof href.pathname === 'string') {
    return href.pathname;
  }
  return null;
}

function isRouteActive(pathname: string, href: NavHref | undefined): boolean {
  const target = toPathname(href);
  if (!target) return false;
  if (target === '/') return pathname === '/';
  return pathname === target || pathname.startsWith(`${target}/`);
}

// The longest matching href wins, so `/app/guests/import` lights up a `/app/guests`
// tab instead of a shorter `/app` tab that prefix-matches every route.
function matchByRoute(
  items: MobileTabBarItem[],
  pathname: string,
): string | null {
  let match: string | null = null;
  let matchLength = -1;

  for (const item of items) {
    const target = toPathname(item.href);
    if (!target || !isRouteActive(pathname, item.href)) continue;
    if (target.length > matchLength) {
      match = item.value;
      matchLength = target.length;
    }
  }

  return match;
}

function hasBadge(
  badge: MobileTabBarItem['badge'],
): badge is number | string | true {
  if (badge === true) return true;
  if (typeof badge === 'number') return badge > 0;
  if (typeof badge === 'string') return badge.length > 0;
  return false;
}

function tabClassName(isActive: boolean, disabled?: boolean) {
  return cn(
    'flex min-h-(--app-bottom-nav-height) w-full flex-col items-center justify-center gap-1 rounded-lg px-1 pt-1.5 pb-1',
    'text-muted-foreground transition-colors outline-none',
    'focus-visible:ring-ring focus-visible:ring-2',
    'active:opacity-70',
    isActive && 'text-foreground',
    disabled && 'pointer-events-none opacity-50',
  );
}

function badgeContent(badge: number | string | true): string {
  if (badge === true) return '';
  if (typeof badge === 'number') return badge > 99 ? '99+' : String(badge);
  return badge;
}

/** Overlays the tab icon, so it needs a `relative` ancestor. */
function TabBadge({ badge }: { badge: number | string | true }) {
  if (badge === true) {
    return (
      <span
        aria-hidden
        className="bg-destructive ring-background absolute -end-0.5 -top-0.5 size-2 rounded-full ring-2"
      />
    );
  }

  return (
    <span className="bg-destructive text-destructive-foreground ring-background absolute -end-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none font-semibold tabular-nums ring-2">
      {badgeContent(badge)}
    </span>
  );
}

function TabContent({
  item,
  isActive,
  showLabels,
}: {
  item: MobileTabBarItem;
  isActive: boolean;
  showLabels: boolean;
}) {
  const Icon = isActive ? (item.activeIcon ?? item.icon) : item.icon;
  // Without a dedicated filled variant, filling the outline icon is what gives
  // the active tab the solid look native tab bars have.
  const fillIcon = isActive && !item.activeIcon;

  return (
    <>
      <span className="relative inline-flex">
        <Icon
          aria-hidden
          className={cn('size-[22px] shrink-0', fillIcon && FILL_ACTIVE_ICON)}
        />
        {hasBadge(item.badge) ? <TabBadge badge={item.badge} /> : null}
      </span>
      {showLabels ? (
        <span
          className={cn(
            'max-w-full truncate text-[11px] leading-none',
            isActive ? 'font-semibold' : 'font-medium',
          )}
        >
          {item.label}
        </span>
      ) : null}
    </>
  );
}

export function MobileTabBar({
  items,
  value,
  defaultValue,
  onValueChange,
  showLabels = true,
  className,
  'aria-label': ariaLabel = 'Bottom navigation',
}: MobileTabBarProps) {
  const pathname = usePathname();
  const [internalValue, setInternalValue] = useState<string | undefined>(
    defaultValue,
  );

  // Publishes `--visual-viewport-bottom`, which the `bottom` below subtracts.
  useVisualViewportOffset();

  // A matching route beats the last tap, so a back gesture or a link from
  // elsewhere in the app still moves the highlight.
  const activeValue =
    value ?? matchByRoute(items, pathname) ?? internalValue ?? defaultValue;

  const select = (item: MobileTabBarItem) => {
    setInternalValue(item.value);
    onValueChange?.(item.value);
    item.onClick?.();
  };

  return (
    <nav
      data-slot="mobile-tab-bar"
      aria-label={ariaLabel}
      className={cn(
        // `bg-card`, matching the mobile header band in `PageCard`: `--background`
        // is darker than `--card` in dark mode, which left the bar reading as a
        // hole below the app-shell canvas.
        'bg-card/95 supports-[backdrop-filter]:bg-card/80 fixed inset-x-0 z-40 border-t backdrop-blur md:hidden',
        // Not `bottom-0`: iOS positions fixed elements against the layout
        // viewport, so while the page is zoomed in the bottom of that viewport
        // is off-screen and a `0` bar goes with it. The variable is the gap
        // between the two viewports and is `0px` whenever the page is not
        // zoomed (see `useVisualViewportOffset`).
        'bottom-[var(--visual-viewport-bottom,0px)]',
        // Keeps the tabs clear of the home indicator on notched devices, and -
        // now that `viewport-fit=cover` lets the page reach the physical edges -
        // clear of the notch itself when the phone is held in landscape.
        'pb-[env(safe-area-inset-bottom)]',
        'ps-[env(safe-area-inset-left)] pe-[env(safe-area-inset-right)]',
        className,
      )}
    >
      <ul
        className="mx-auto grid max-w-md items-stretch"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const isActive = item.value === activeValue;

          return (
            <li key={item.value} className="flex">
              {item.href !== undefined && !item.disabled ? (
                <Link
                  href={item.href}
                  aria-label={showLabels ? undefined : item.label}
                  aria-current={isActive ? 'page' : undefined}
                  data-active={isActive || undefined}
                  className={tabClassName(isActive, item.disabled)}
                  onClick={() => select(item)}
                >
                  <TabContent
                    item={item}
                    isActive={isActive}
                    showLabels={showLabels}
                  />
                </Link>
              ) : (
                <button
                  type="button"
                  aria-label={showLabels ? undefined : item.label}
                  aria-current={isActive ? 'page' : undefined}
                  data-active={isActive || undefined}
                  disabled={item.disabled}
                  className={tabClassName(isActive, item.disabled)}
                  onClick={() => select(item)}
                >
                  <TabContent
                    item={item}
                    isActive={isActive}
                    showLabels={showLabels}
                  />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default MobileTabBar;
