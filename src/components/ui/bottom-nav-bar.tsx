'use client';

import { useId, useState, type ElementType } from 'react';
import { motion } from 'framer-motion';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export type BottomNavItem = {
  title: string;
  icon: ElementType;
  variant?: 'default' | 'featured' | 'menu';
  url?: string;
  onClick?: () => void;
  /** Sub-items rendered inside the popup, for `variant: 'menu'`. */
  items?: BottomNavItem[];
};

type BottomNavBarProps = {
  items: BottomNavItem[];
  disabled?: boolean;
  className?: string;
};

function isActiveRoute(pathname: string, routeUrl: string): boolean {
  if (pathname === routeUrl) return true;
  const routeMatch = routeUrl.match(/^\/app\/(?:[^/]+\/)?(.+)$/);
  if (!routeMatch) return false;
  const routePath = routeMatch[1];
  const pathnameMatch = pathname.match(/^\/app\/(?:[^/]+\/)?(.+)$/);
  if (pathnameMatch) {
    return pathnameMatch[1] === routePath;
  }
  return false;
}

function isItemActive(pathname: string, item: BottomNavItem): boolean {
  if (typeof item.url === 'string') return isActiveRoute(pathname, item.url);
  if (item.items) {
    return item.items.some((sub) => isItemActive(pathname, sub));
  }
  return false;
}

const LABEL_WIDTH = 72;
const itemClassName =
  'flex items-center justify-center px-2 py-2 rounded-full transition-colors duration-200 h-10 min-w-10 min-h-[40px] max-h-[44px] focus:outline-none focus-visible:ring-0';

const AI_GRADIENT_STOPS = (
  <>
    <stop offset="0%" stopColor="#22d3ee" />
    <stop offset="45%" stopColor="#8b5cf6" />
    <stop offset="100%" stopColor="#d946ef" />
  </>
);

function NavIcon({
  icon: Icon,
  featured,
  gradientId,
  size = 22,
}: {
  icon: ElementType;
  featured?: boolean;
  gradientId: string;
  size?: number;
}) {
  return (
    <Icon
      size={size}
      strokeWidth={2}
      aria-hidden
      color={featured ? `url(#${gradientId})` : undefined}
      className={cn(
        'transition-colors duration-200 shrink-0',
        featured ? 'text-purple-600' : undefined,
      )}
    >
      {featured ? (
        <defs>
          <linearGradient
            id={gradientId}
            x1="3"
            y1="3"
            x2="21"
            y2="21"
            gradientUnits="userSpaceOnUse"
          >
            {AI_GRADIENT_STOPS}
          </linearGradient>
        </defs>
      ) : null}
    </Icon>
  );
}

function ActiveLabel({ show, title }: { show: boolean; title: string }) {
  return (
    <motion.div
      initial={false}
      animate={{
        width: show ? `${LABEL_WIDTH}px` : '0px',
        opacity: show ? 1 : 0,
      }}
      transition={{
        width: { type: 'spring', stiffness: 350, damping: 32 },
        opacity: { duration: 0.19 },
      }}
      className="overflow-hidden flex items-center"
    >
      <span
        className="font-medium text-xs whitespace-nowrap select-none text-primary leading-[1.9]"
        title={title}
      >
        {title}
      </span>
    </motion.div>
  );
}

function MenuNavItem({
  item,
  disabled,
  pathname,
  showActiveLabel,
  gradientId,
}: {
  item: BottomNavItem;
  disabled?: boolean;
  pathname: string;
  showActiveLabel: boolean;
  gradientId: string;
}) {
  const [open, setOpen] = useState(false);
  const subItems = item.items ?? [];
  const isActive = !disabled && isItemActive(pathname, item);
  const showLabel = isActive && showActiveLabel;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          aria-label={item.title}
          aria-current={isActive ? 'page' : undefined}
          disabled={disabled}
          className={cn(
            itemClassName,
            isActive || open
              ? cn('bg-primary/10 text-primary', showLabel && 'gap-2')
              : 'bg-transparent text-muted-foreground hover:bg-muted',
            disabled && 'pointer-events-none opacity-50',
          )}
        >
          <NavIcon icon={item.icon} gradientId={gradientId} />
          <ActiveLabel show={showLabel} title={item.title} />
        </motion.button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        sideOffset={12}
        className="w-52 rounded-2xl p-1.5"
      >
        <div className="flex flex-col">
          {subItems.map((sub, index) => (
            <MenuRow
              key={sub.title}
              item={sub}
              disabled={disabled}
              pathname={pathname}
              gradientId={`${gradientId}-sub-${index}`}
              onNavigate={() => setOpen(false)}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function MenuRow({
  item,
  disabled,
  pathname,
  gradientId,
  onNavigate,
}: {
  item: BottomNavItem;
  disabled?: boolean;
  pathname: string;
  gradientId: string;
  onNavigate: () => void;
}) {
  const isFeatured = item.variant === 'featured';
  const isActive =
    !disabled && typeof item.url === 'string' && isActiveRoute(pathname, item.url);
  const className = cn(
    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
    isActive
      ? 'bg-primary/10 text-primary'
      : 'text-foreground hover:bg-muted',
    disabled && 'pointer-events-none opacity-50',
  );
  const content = (
    <>
      <NavIcon icon={item.icon} featured={isFeatured} gradientId={gradientId} size={20} />
      <span className="truncate">{item.title}</span>
    </>
  );

  if (typeof item.url === 'string') {
    return (
      <Link
        href={disabled ? ('/app' as const) : (item.url as '/app')}
        aria-current={isActive ? 'page' : undefined}
        className={className}
        onClick={onNavigate}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      disabled={disabled}
      onClick={() => {
        item.onClick?.();
        onNavigate();
      }}
    >
      {content}
    </button>
  );
}

export function BottomNavBar({ items, disabled, className }: BottomNavBarProps) {
  const pathname = usePathname();
  const gradientId = `ai-nav-gradient-${useId().replace(/:/g, '')}`;
  const showActiveLabel = items.length < 6;

  return (
    <motion.nav
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      role="navigation"
      aria-label="Bottom Navigation"
      className={cn(
        'bg-card border border-border rounded-full flex h-[52px] w-full max-w-[420px] items-center justify-between gap-1 p-2 shadow-xl',
        className,
      )}
    >
      {items.map((item, index) => {
        if (item.variant === 'menu') {
          return (
            <MenuNavItem
              key={item.title}
              item={item}
              disabled={disabled}
              pathname={pathname}
              showActiveLabel={showActiveLabel}
              gradientId={`${gradientId}-menu-${index}`}
            />
          );
        }

        const itemUrl = item.url;
        const isLink = typeof itemUrl === 'string';
        const isActive = !disabled && isLink && isActiveRoute(pathname, itemUrl);
        const isFeatured = item.variant === 'featured';
        const showLabel = isActive && !isFeatured && showActiveLabel;
        const commonClassName = cn(
          itemClassName,
          isFeatured
            ? 'bg-transparent text-purple-600 hover:bg-muted'
            : isActive
            ? cn('bg-primary/10 text-primary', showLabel && 'gap-2')
            : 'bg-transparent text-muted-foreground hover:bg-muted',
          disabled && 'pointer-events-none opacity-50',
        );

        const content = (
          <>
            <NavIcon
              icon={item.icon}
              featured={isFeatured}
              gradientId={`${gradientId}-${index}`}
            />
            <ActiveLabel show={showLabel} title={item.title} />
          </>
        );

        return (
          <motion.div key={item.title} whileTap={{ scale: 0.97 }}>
            {isLink ? (
              <Link
                href={disabled ? ('/app' as const) : (itemUrl as '/app')}
                aria-label={item.title}
                aria-current={isActive ? 'page' : undefined}
                className={commonClassName}
              >
                {content}
              </Link>
            ) : (
              <button
                type="button"
                aria-label={item.title}
                className={commonClassName}
                disabled={disabled}
                onClick={item.onClick}
              >
                {content}
              </button>
            )}
          </motion.div>
        );
      })}
    </motion.nav>
  );
}

export default BottomNavBar;
