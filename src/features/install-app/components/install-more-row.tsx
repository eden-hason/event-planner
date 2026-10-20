'use client';

import { useState, type ReactNode } from 'react';
import { useInstallability, useInstallShown } from '../hooks/use-installability';
import { InstallDrawer } from './install-drawer';

/**
 * The permanent way to install from the More page. It ignores the Install
 * Card's dismissal, so a ✕ on Home is never a dead end, and hides itself where
 * nothing can be installed or the app is already running installed. The page
 * draws the row itself, so it matches its neighbours; this supplies what a tap
 * does. The caller keeps it from Visitors.
 */
export function InstallMoreRow({
  children,
}: {
  children: (onClick: () => void) => ReactNode;
}) {
  const { platform, promptInstall, tapped, dismiss } = useInstallability('more');
  const [drawerOpen, setDrawerOpen] = useState(false);
  useInstallShown(platform !== 'none', platform, 'more');

  if (platform === 'none') return null;

  const onClick = () => {
    tapped();
    if (platform === 'android') void promptInstall();
    else setDrawerOpen(true);
  };

  return (
    <>
      {children(onClick)}
      {platform !== 'android' && (
        <InstallDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          browser={platform}
          // Done here also retires the Home card: one dismissal, wherever it was made.
          onDone={() => {
            setDrawerOpen(false);
            dismiss('done');
          }}
        />
      )}
    </>
  );
}
