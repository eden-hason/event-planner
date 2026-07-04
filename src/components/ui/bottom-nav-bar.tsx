'use client';

import { useId, type ElementType } from 'react';
import { motion } from 'framer-motion';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export type BottomNavItem = {
  title: string;
  icon: ElementType;
  variant?: 'default' | 'featured';
  url?: string;
  onClick?: () => void;
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

const LABEL_WIDTH = 72;
const itemClassName =
  'flex items-center justify-center px-2 py-2 rounded-full transition-colors duration-200 h-10 min-w-10 min-h-[40px] max-h-[44px] focus:outline-none focus-visible:ring-0';

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
      {items.map((item) => {
        const Icon = item.icon;
        const itemUrl = item.url;
        const isLink = typeof itemUrl === 'string';
        const isActive = !disabled && isLink && isActiveRoute(pathname, itemUrl);
        const isFeatured = item.variant === 'featured';
        const commonClassName = cn(
          itemClassName,
          isFeatured
            ? 'bg-transparent text-purple-600 hover:bg-muted'
            : isActive
            ? 'bg-primary/10 text-primary gap-2'
            : 'bg-transparent text-muted-foreground hover:bg-muted',
          disabled && 'pointer-events-none opacity-50',
        );

        const content = (
          <>
            <Icon
              size={22}
              strokeWidth={2}
              aria-hidden
              color={isFeatured ? `url(#${gradientId})` : undefined}
              className={cn(
                'transition-colors duration-200 shrink-0',
                isFeatured ? 'text-purple-600' : undefined,
              )}
            >
              {isFeatured ? (
                <defs>
                  <linearGradient id={gradientId} x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="45%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#d946ef" />
                  </linearGradient>
                </defs>
              ) : null}
            </Icon>
            <motion.div
              initial={false}
              animate={{
                width: isActive && !isFeatured && showActiveLabel ? `${LABEL_WIDTH}px` : '0px',
                opacity: isActive && !isFeatured && showActiveLabel ? 1 : 0,
              }}
              transition={{
                width: { type: 'spring', stiffness: 350, damping: 32 },
                opacity: { duration: 0.19 },
              }}
              className="overflow-hidden flex items-center"
            >
              <span
                className="font-medium text-xs whitespace-nowrap select-none text-primary leading-[1.9]"
                title={item.title}
              >
                {item.title}
              </span>
            </motion.div>
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
