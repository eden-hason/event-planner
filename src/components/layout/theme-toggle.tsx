'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const THEME_OPTIONS = [
  { value: 'light', Icon: Sun },
  { value: 'dark', Icon: Moon },
  { value: 'system', Icon: Monitor },
] as const;

/**
 * `next-themes` only knows the real theme once mounted on the client -
 * before that `theme` is `undefined` - so every trigger icon below holds off
 * on choosing Sun vs Moon until then to avoid a hydration mismatch.
 */
function useMountedTheme() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return { theme, setTheme, mounted };
}

/**
 * Light/dark/system submenu, meant to sit inside an existing DropdownMenu
 * (see `UserMenu`).
 */
export function ThemeMenuItems({
  labels,
}: {
  labels: { theme: string; light: string; dark: string; system: string };
}) {
  const { theme, setTheme, mounted } = useMountedTheme();

  const TriggerIcon = mounted && theme === 'light' ? Sun : mounted && theme === 'dark' ? Moon : Monitor;
  const optionLabel = { light: labels.light, dark: labels.dark, system: labels.system };

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <TriggerIcon />
        {labels.theme}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          {THEME_OPTIONS.map(({ value, Icon }) => (
            <DropdownMenuRadioItem key={value} value={value}>
              <Icon />
              {optionLabel[value]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

/**
 * Standalone version of the same switch for surfaces without a host menu to
 * nest inside, like the admin back office top bar.
 */
export function ThemeToggle({
  labels,
}: {
  labels: { light: string; dark: string; system: string };
}) {
  const { theme, setTheme, mounted } = useMountedTheme();

  return (
    <div className="flex items-center rounded-md border p-0.5">
      {THEME_OPTIONS.map(({ value, Icon }) => (
        <button
          key={value}
          type="button"
          aria-label={labels[value]}
          aria-pressed={mounted && theme === value}
          onClick={() => setTheme(value)}
          className={
            mounted && theme === value
              ? 'bg-accent text-accent-foreground flex size-7 items-center justify-center rounded-sm'
              : 'text-muted-foreground hover:text-foreground flex size-7 items-center justify-center rounded-sm'
          }
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  );
}

/**
 * Icon-button trigger + dropdown, styled to sit flush next to another
 * ghost icon-button (see `NotificationsMenu`) in a page's chrome row rather
 * than inside a menu.
 */
export function ThemeMenuButton({
  labels,
}: {
  labels: { theme: string; light: string; dark: string; system: string };
}) {
  const { theme, setTheme, mounted } = useMountedTheme();

  const TriggerIcon = mounted && theme === 'light' ? Sun : mounted && theme === 'dark' ? Moon : Monitor;
  const optionLabel = { light: labels.light, dark: labels.dark, system: labels.system };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={labels.theme}>
          <TriggerIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8}>
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          {THEME_OPTIONS.map(({ value, Icon }) => (
            <DropdownMenuRadioItem key={value} value={value}>
              <Icon />
              {optionLabel[value]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
