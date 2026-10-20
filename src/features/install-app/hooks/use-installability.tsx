'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useSaveEvent } from '@/features/auth';
import { InstallDrawer } from '../components/install-drawer';
import type { DismissVia, InstallPlatform, InstallSurface } from '../types';
import { captureInstallEvent } from '../utils/analytics';
import {
  dismissInstallCard,
  getInstallPrompt,
  isInstallCardDismissed,
  isRunningInstalled,
  runInstallPrompt,
  subscribeInstallStore,
} from '../utils/install-store';
import { detectInstallPlatform } from '../utils/platform';

const noSubscription = () => () => {};

let detected: InstallPlatform | null = null;
function clientPlatform(): InstallPlatform {
  detected ??= detectInstallPlatform(
    navigator.userAgent,
    navigator.maxTouchPoints,
  );
  return detected;
}

/**
 * Everything an install surface needs: whether to show, what a tap does, and
 * the iOS instructions drawer to render alongside it.
 *
 * `platform` is `'none'` on the server, on desktop, inside an in-app browser,
 * when already running as the installed app, on Android until the browser has
 * handed us its install event, and for a Visitor - on iOS the home-screen app
 * keeps its own storage, so it would open without their unsaved Event.
 *
 * The Home card hides once dismissed; the More row ignores the dismissal, so a
 * ✕ on Home is never a dead end. `onDone` replaces the drawer's default "Done"
 * (store the dismissal), for a surface that animates out first.
 */
export function useInstallability(
  surface: InstallSurface,
  { onDone }: { onDone?: () => void } = {},
) {
  const { isVisitor } = useSaveEvent();
  const detectedPlatform = useSyncExternalStore(
    noSubscription,
    clientPlatform,
    () => 'none' as const,
  );
  const installed = useSyncExternalStore(
    noSubscription,
    isRunningInstalled,
    () => false,
  );
  const prompt = useSyncExternalStore(
    subscribeInstallStore,
    getInstallPrompt,
    () => null,
  );
  // True on the server, so nothing renders before the browser has been asked.
  const dismissed = useSyncExternalStore(
    subscribeInstallStore,
    isInstallCardDismissed,
    () => true,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);

  const platform: InstallPlatform =
    isVisitor || installed || (detectedPlatform === 'android' && !prompt)
      ? 'none'
      : detectedPlatform;
  const visible = platform !== 'none' && (surface === 'more' || !dismissed);

  const logged = useRef(false);
  useEffect(() => {
    if (!visible || logged.current) return;
    logged.current = true;
    captureInstallEvent({ name: 'install_card_shown' }, { platform, surface });
  }, [visible, platform, surface]);

  const dismiss = (via: DismissVia) => {
    if (platform !== 'none') {
      captureInstallEvent(
        { name: 'install_card_dismissed', via },
        { platform, surface },
      );
    }
    dismissInstallCard();
  };

  /** "Add": Android opens the browser's install dialog, iOS our drawer. Never dismisses. */
  const open = async () => {
    if (platform === 'none') return;
    captureInstallEvent({ name: 'install_card_tapped' }, { platform, surface });
    if (platform !== 'android') {
      setDrawerOpen(true);
      return;
    }
    const outcome = await runInstallPrompt();
    if (outcome) {
      captureInstallEvent(
        { name: 'install_prompt_result', outcome },
        { platform, surface },
      );
    }
  };

  const drawer =
    platform === 'ios-safari' || platform === 'ios-chrome' ? (
      <InstallDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        browser={platform}
        onDone={onDone ?? (() => dismiss('done'))}
      />
    ) : null;

  return { visible, open, dismiss, drawer };
}
