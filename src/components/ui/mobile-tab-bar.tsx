'use client';

import { useState, type ComponentProps, type ElementType } from 'react';

import { Link, usePathname } from '@/i18n/navigation';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
  /**
   * Sub-items listed in a popover above the bar, which turns the tab into a
   * "More" launcher. Only one level deep - sub-items of sub-items are ignored.
   */
  items?: MobileTabBarItem[];
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
// tab instead of a shorter `/app` tab that prefix-matches every route. A sub-item
// match reports its parent, which is the tab that has to light up in the bar.
function matchByRoute(
  items: MobileTabBarItem[],
  pathname: string,
): string | null {
  let match: string | null = null;
  let matchLength = -1;

  const consider = (href: NavHref | undefined, value: string) => {
    const target = toPathname(href);
    if (!target || !isRouteActive(pathname, href)) return;
    if (target.length > matchLength) {
      match = value;
      matchLength = target.length;
    }
  };

  for (const item of items) {
    consider(item.href, item.value);
    for (const sub of item.items ?? []) consider(sub.href, item.value);
  }

  return match;
}

function isTabActive(item: MobileTabBarItem, activeValue?: string): boolean {
  if (activeValue === undefined) return false;
  if (item.value === activeValue) return true;
  return (item.items ?? []).some((sub) => sub.value === activeValue);
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
    'flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-lg px-1 pt-1.5 pb-1',
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

/** Sits at the end of a popover row rather than over an icon. */
function RowBadge({ badge }: { badge: number | string | true }) {
  if (badge === true) {
    return (
      <span aria-hidden className="bg-destructive ms-auto size-2 shrink-0 rounded-full" />
    );
  }

  return (
    <span className="bg-destructive text-destructive-foreground ms-auto flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 text-[10px] leading-none font-semibold tabular-nums">
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

function MenuRow({
  item,
  isActive,
  onSelect,
}: {
  item: MobileTabBarItem;
  isActive: boolean;
  onSelect: () => void;
}) {
  const Icon = isActive ? (item.activeIcon ?? item.icon) : item.icon;
  const className = cn(
    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
    isActive ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-muted',
    item.disabled && 'pointer-events-none opacity-50',
  );

  const content = (
    <>
      <Icon aria-hidden className="size-[18px] shrink-0" />
      <span className="truncate">{item.label}</span>
      {hasBadge(item.badge) ? <RowBadge badge={item.badge} /> : null}
    </>
  );

  if (item.href !== undefined && !item.disabled) {
    return (
      <Link
        href={item.href}
        aria-current={isActive ? 'page' : undefined}
        data-active={isActive || undefined}
        className={className}
        onClick={onSelect}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-current={isActive ? 'page' : undefined}
      data-active={isActive || undefined}
      disabled={item.disabled}
      className={className}
      onClick={onSelect}
    >
      {content}
    </button>
  );
}

function MenuTab({
  item,
  isActive,
  activeValue,
  showLabels,
  onSelect,
}: {
  item: MobileTabBarItem;
  isActive: boolean;
  activeValue?: string;
  showLabels: boolean;
  onSelect: (item: MobileTabBarItem) => void;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const subItems = item.items ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={showLabels ? undefined : item.label}
          aria-haspopup="menu"
          aria-expanded={open}
          data-active={isActive || undefined}
          disabled={item.disabled}
          className={tabClassName(isActive || open, item.disabled)}
        >
          <TabContent item={item} isActive={isActive} showLabels={showLabels} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        sideOffset={8}
        className="w-56 rounded-2xl p-1.5"
      >
        <div className="flex flex-col">
          {subItems.map((sub) => (
            <MenuRow
              key={sub.value}
              item={sub}
              isActive={
                sub.value === activeValue || isRouteActive(pathname, sub.href)
              }
              onSelect={() => {
                setOpen(false);
                onSelect(sub);
              }}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
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
        'bg-card/95 supports-[backdrop-filter]:bg-card/80 fixed inset-x-0 bottom-0 z-50 border-t backdrop-blur md:hidden',
        // Keeps the tabs clear of the home indicator on notched devices.
        'pb-[env(safe-area-inset-bottom)]',
        className,
      )}
    >
      <ul
        className="mx-auto grid max-w-md items-stretch"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const isActive = isTabActive(item, activeValue);

          if (item.items?.length) {
            return (
              <li key={item.value} className="flex">
                <MenuTab
                  item={item}
                  isActive={isActive}
                  activeValue={activeValue}
                  showLabels={showLabels}
                  onSelect={select}
                />
              </li>
            );
          }

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
