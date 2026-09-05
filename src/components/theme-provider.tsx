'use client';

import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';
import { Toaster } from 'sonner';

/**
 * Thin wrapper so the root layout (a Server Component) can mount next-themes
 * without itself becoming a Client Component.
 *
 * `.dark` lands on `<html>` for the whole document - see the comment above
 * `.theme-locked-light` in globals.css for how guest-facing and marketing
 * pages opt back out of it.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
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
 * toast fires from a locked-light guest page while the visitor's OS is in
 * dark mode, the toast itself may go dark even though the page around it
 * doesn't - an acceptable trade for not having to duplicate Sonner's theming
 * per route.
 */
function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return <Toaster theme={resolvedTheme === 'dark' ? 'dark' : 'light'} />;
}
