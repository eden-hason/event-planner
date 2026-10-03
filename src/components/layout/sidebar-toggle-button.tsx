'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Menu, PanelLeft, PanelRight, X } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

/**
 * Collapses/expands the sidebar. Lives in the main content card's header row
 * rather than the sidebar itself, so it stays reachable even when the
 * sidebar is fully collapsed to icons.
 *
 * On mobile the sidebar isn't a collapsible panel at all - `toggleSidebar`
 * opens/closes an off-canvas Sheet instead - so the panel-collapse icons
 * would be describing a mechanic that doesn't exist there. A hamburger
 * (morphing to a close X while open) is the icon for that job instead.
 */
export function SidebarToggleButton({ className }: { className?: string }) {
  const { toggleSidebar, isMobile, openMobile } = useSidebar();
  const locale = useLocale();
  const t = useTranslations('sidebar');
  const isRTL = locale === 'he';

  // One icon for both states: it draws the sidebar's side, and the sidebar
  // itself shows whether it is open.
  const Icon = isMobile ? (openMobile ? X : Menu) : isRTL ? PanelRight : PanelLeft;

  return (
    <button
      onClick={toggleSidebar}
      className={cn(
        'text-muted-foreground hover:bg-accent hover:text-accent-foreground flex size-8 shrink-0 items-center justify-center rounded-md transition-colors',
        className,
      )}
    >
      <Icon className="size-4" />
      <span className="sr-only">{t('toggleSidebar')}</span>
    </button>
  );
}
