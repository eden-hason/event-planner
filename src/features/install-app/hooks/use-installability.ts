'use client';

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
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
  detected ??= detectInstallPlatform(navigator.userAgent, navigator.maxTouchPoints);
  return detected;
}

/**
 * What this device can do about installing Kululu, for one surface.
 *
 * `platform` is `'none'` on the server, on desktop, inside an in-app browser,
 * when already running as the installed app, and on Android until the browser
 * has handed us its install event. `dismissed` is true on the server, so
 * nothing renders before the browser has been asked.
 */
export function useInstallability(surface: InstallSurface) {
  const detectedPlatform = useSyncExternalStore(noSubscription, clientPlatform, () => 'none' as const);
  const installed = useSyncExternalStore(noSubscription, isRunningInstalled, () => false);
  const prompt = useSyncExternalStore(subscribeInstallStore, getInstallPrompt, () => null);
  const dismissed = useSyncExternalStore(subscribeInstallStore, isInstallCardDismissed, () => true);

  const platform: InstallPlatform = installed
    ? 'none'
    : detectedPlatform === 'android' && !prompt
      ? 'none'
      : detectedPlatform;

  /** Android: opens the browser's install dialog and reports what was chosen. */
  const promptInstall = useCallback(async () => {
    if (platform !== 'android') return;
    const outcome = await runInstallPrompt();
    if (outcome) {
      captureInstallEvent({ name: 'install_prompt_result', outcome }, { platform, surface });
    }
  }, [platform, surface]);

  const tapped = useCallback(() => {
    if (platform !== 'none') {
      captureInstallEvent({ name: 'install_card_tapped' }, { platform, surface });
    }
  }, [platform, surface]);

  const dismiss = useCallback(
    (via: DismissVia) => {
      if (platform !== 'none') {
        captureInstallEvent({ name: 'install_card_dismissed', via }, { platform, surface });
      }
      dismissInstallCard();
    },
    [platform, surface],
  );

  return { platform, dismissed, promptInstall, tapped, dismiss };
}

/** Logs `install_card_shown` once per page view, the first time `visible` is true. */
export function useInstallShown(
  visible: boolean,
  platform: InstallPlatform,
  surface: InstallSurface,
) {
  const logged = useRef(false);
  useEffect(() => {
    if (!visible || platform === 'none' || logged.current) return;
    logged.current = true;
    captureInstallEvent({ name: 'install_card_shown' }, { platform, surface });
  }, [visible, platform, surface]);
}
