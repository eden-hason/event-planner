'use client';

import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';
import { IconCircleCheckFilled } from '@tabler/icons-react';
import { Toaster } from 'sonner';

/**
 * Thin wrapper so the root layout (a Server Component) can mount next-themes
 * without itself becoming a Client Component.
 *
 * `.dark` lands on `<html>` for the whole document - see the comment above
 * `.theme-locked-light` in globals.css for how guest-facing and marketing
 * pages opt back out of it.
 *
 * Light is the default regardless of the OS setting; dark (or following the
 * OS via "System") only applies once the user picks it in the theme menu.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem>
      {children}
      <ThemedToaster />
    </NextThemesProvider>
  );
}

/**
 * `<Toaster>` lives at the document root (toasts can fire from any route),
 * not inside a particular page's markup, so a `.theme-locked-light` reset
 * elsewhere in the tree can't reach it. It follows `resolvedTheme` directly
 * instead - sonner's own light/dark palette - so a toast still reads
 * correctly on top of whatever the operator has chosen. In the rare case a
 * toast fires from a locked-light guest page while the visitor has chosen
 * dark mode, the toast itself may go dark even though the page around it
 * doesn't - an acceptable trade for not having to duplicate Sonner's theming
 * per route.
 */
function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      position="top-center"
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      icons={{
        success: <IconCircleCheckFilled className="text-success size-4" />,
      }}
    />
  );
}
