'use client';

import { type ReactNode } from 'react';
import { useInstallability } from '../hooks/use-installability';

/**
 * The permanent way to install from the More page. It ignores the Install
 * Card's dismissal, so a ✕ on Home is never a dead end, and hides itself where
 * nothing can be installed. The page draws the row itself, so it matches its
 * neighbours; this supplies what a tap does. "Done" in its drawer still retires
 * the Home card: one dismissal, wherever it was made.
 */
export function InstallMoreRow({
  children,
}: {
  children: (onClick: () => void) => ReactNode;
}) {
  const { visible, open, drawer } = useInstallability('more');
  if (!visible) return null;

  return (
    <>
      {children(() => void open())}
      {drawer}
    </>
  );
}
