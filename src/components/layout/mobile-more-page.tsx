'use client';

import { type ElementType, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Bell, ChevronRight, LogOut } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useFeatureHeader } from '@/components/feature-layout';
import { LanguageSwitcher } from '@/components/language-switcher';
import { type EventApp } from '@/features/events';
import { cn } from '@/lib/utils';
import {
  eventDisplayTitle,
  eventInitials,
  formatEventDateShort,
} from './event-summary';
import { MobileEventSwitcher } from './mobile-event-switcher';
import { useMoreNavItems } from './more-nav-items';
import { THEME_OPTIONS, useMountedTheme } from './theme-toggle';
import { useLogout } from './use-logout';
import type { NavHref } from './nav-urls';

type MobileMorePageProps = {
  eventId: string;
  events: EventApp[];
  guestCounts: Record<string, number>;
  currentUserId?: string;
  /** Rendered in the footer when the build sets it. */
  appVersion?: string;
};

/** White card with hairline-separated rows, the page's one repeated container. */
function RowCard({ children }: { children: ReactNode }) {
  return (
    <div className="bg-card divide-border divide-y overflow-hidden rounded-xl border">
      {children}
    </div>
  );
}

const ROW_CLASS =
  'flex w-full items-center gap-3 px-3.5 py-3 text-start transition-colors active:opacity-70';

/** Points at the row's destination in both directions. */
function RowChevron() {
  return (
    <ChevronRight
      aria-hidden
      className="text-muted-foreground/60 size-[18px] shrink-0 rtl:rotate-180"
    />
  );
}

/**
 * A tool row: tinted icon tile, title over a one-line description, chevron.
 * Renders as a link when the tool has a route and as a button when it only
 * runs an action, like the assistant launcher.
 */
function ToolRow({
  icon: Icon,
  tint,
  label,
  description,
  href,
  onClick,
}: {
  icon: ElementType;
  tint: string;
  label: string;
  description: string;
  href?: NavHref;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span
        aria-hidden
        className={cn(
          'flex size-9.5 shrink-0 items-center justify-center rounded-[9px]',
          tint,
        )}
      >
        <Icon className="size-[19px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] leading-tight font-medium">
          {label}
        </span>
        <span className="text-muted-foreground mt-0.5 block truncate text-xs">
          {description}
        </span>
      </span>
      <RowChevron />
    </>
  );

  if (href !== undefined) {
    return (
      <Link href={href} className={ROW_CLASS}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={ROW_CLASS}>
      {content}
    </button>
  );
}

/** An account row: bare icon, title, and whatever control the row carries. */
function AccountRow({
  icon: Icon,
  label,
  trailing,
  destructive,
  onClick,
  bare,
}: {
  icon: ElementType;
  label: string;
  trailing?: ReactNode;
  destructive?: boolean;
  onClick?: () => void;
  /** Renders the row's contents only, for use inside a menu trigger. */
  bare?: boolean;
}) {
  const content = (
    <>
      <Icon
        aria-hidden
        className={cn(
          'mx-1 size-[18px] shrink-0',
          destructive ? 'text-destructive' : 'text-muted-foreground',
        )}
      />
      <span
        className={cn(
          'flex-1 truncate text-[15px] font-medium',
          destructive && 'text-destructive',
        )}
      >
        {label}
      </span>
      {trailing}
    </>
  );

  // A trigger already renders the button, so a `bare` row hands over only its
  // contents rather than nesting a second button inside one.
  if (bare) return <>{content}</>;

  return (
    <button type="button" onClick={onClick} className={ROW_CLASS}>
      {content}
    </button>
  );
}

/**
 * The mobile "More" page: the current event and how to change it, the tools
 * that did not fit in the five-slot tab bar, and the account controls that
 * otherwise only exist inside the sidebar drawer.
 *
 * Capped at `max-w-md` because it is a phone layout by design - reaching the
 * route on a desktop shows the same column centred rather than a row of rows
 * stretched across the content card.
 */
export function MobileMorePage({
  eventId,
  events,
  guestCounts,
  currentUserId,
  appVersion,
}: MobileMorePageProps) {
  const locale = useLocale();
  const dir = locale === 'he' ? 'rtl' : 'ltr';
  const t = useTranslations('more');
  const tSidebar = useTranslations('sidebar');
  const tNotifications = useTranslations('sidebar.notifications');
  const tools = useMoreNavItems();
  const logout = useLogout();
  const { theme, setTheme, mounted } = useMountedTheme();

  useFeatureHeader({ title: t('title') });

  const currentEvent = events.find((event) => event.id === eventId);
  const date = currentEvent
    ? formatEventDateShort(currentEvent.eventDate, locale)
    : null;
  const guestCount = guestCounts[eventId];

  const themeLabels = {
    theme: tSidebar('theme'),
    light: tSidebar('themeLight'),
    dark: tSidebar('themeDark'),
    system: tSidebar('themeSystem'),
  } as const;
  // `undefined` until mounted, so the row renders the same on the server as it
  // does before `next-themes` has read the stored preference.
  const activeTheme = THEME_OPTIONS.find(
    (option) => mounted && option.value === theme,
  );
  const ThemeIcon = activeTheme?.Icon ?? THEME_OPTIONS[2].Icon;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3.5">
      {currentEvent && (
        <div className="bg-card flex items-center gap-3 rounded-xl border p-3.5">
          <span
            aria-hidden
            className="bg-primary text-primary-foreground flex size-12 shrink-0 items-center justify-center rounded-[10px] text-lg font-bold"
          >
            {eventInitials(currentEvent)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base leading-tight font-semibold">
              {eventDisplayTitle(currentEvent, locale)}
            </p>
            <p className="text-muted-foreground mt-0.5 truncate text-xs">
              {[
                date ?? t('noDate'),
                guestCount === undefined
                  ? null
                  : t('guestCount', { count: guestCount }),
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          <MobileEventSwitcher
            events={events}
            currentEventId={eventId}
            guestCounts={guestCounts}
            currentUserId={currentUserId}
          />
        </div>
      )}

      {tools.length > 0 && (
        <RowCard>
          {tools.map((tool) => (
            <ToolRow
              key={tool.value}
              icon={tool.icon}
              tint={tool.tint}
              label={tool.label}
              description={tool.description}
              href={tool.href}
              onClick={tool.onClick}
            />
          ))}
        </RowCard>
      )}

      <RowCard>
        <DropdownMenu dir={dir}>
          <DropdownMenuTrigger className={ROW_CLASS}>
            <AccountRow
              bare
              icon={ThemeIcon}
              label={themeLabels.theme}
              trailing={
                <>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {activeTheme ? themeLabels[activeTheme.value] : ''}
                  </span>
                  <RowChevron />
                </>
              }
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8}>
            <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
              {THEME_OPTIONS.map(({ value, Icon }) => (
                <DropdownMenuRadioItem key={value} value={value}>
                  <Icon />
                  {themeLabels[value]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <Popover>
          <PopoverTrigger className={ROW_CLASS}>
            <AccountRow
              bare
              icon={Bell}
              label={tNotifications('title')}
              trailing={<RowChevron />}
            />
          </PopoverTrigger>
          <PopoverContent align="end" sideOffset={8} className="w-72 p-0">
            <div className="border-b px-4 py-3">
              <p className="text-sm font-semibold">{tNotifications('title')}</p>
            </div>
            <div className="text-muted-foreground px-4 py-8 text-center text-sm">
              {tNotifications('empty')}
            </div>
          </PopoverContent>
        </Popover>

        {/*
          Same gate as the sidebar footer: the switcher is a development aid
          until the English catalogue is ready to be offered to users.
        */}
        {process.env.NODE_ENV !== 'production' && (
          <div className={cn(ROW_CLASS, 'justify-between')}>
            <span className="text-[15px] font-medium">{t('language')}</span>
            <LanguageSwitcher />
          </div>
        )}

        <AccountRow
          icon={LogOut}
          label={tSidebar('logOut')}
          destructive
          onClick={() => void logout()}
        />
      </RowCard>

      <p className="text-muted-foreground/70 py-1 text-center text-[11px]">
        {appVersion ? t('versionLine', { version: appVersion }) : t('wordmark')}
      </p>
    </div>
  );
}
