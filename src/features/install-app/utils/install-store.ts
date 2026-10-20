import type { BeforeInstallPromptEvent } from '../types';

/**
 * Browser-only state behind the Install Card: the install event Android handed
 * us, and whether this device dismissed the card. Both are facts about the
 * device, not the Owner, so nothing here touches the server.
 *
 * Kept free of React so `instrumentation-client.ts` can start listening before
 * the app hydrates - Chrome may fire `beforeinstallprompt` before any component
 * has mounted, and a missed event is gone until the next page load.
 */

const DISMISSED_KEY = 'kululu:install-card-dismissed';

let prompt: BeforeInstallPromptEvent | null = null;
let dismissed: boolean | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

/**
 * Holds on to Chrome's install event and stops its own mini-infobar, site-wide,
 * so Guests on RSVP pages are never asked to install the Owner's planning tool.
 * Only the Install Card and the More row ever offer it.
 */
export function captureInstallPrompt() {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    prompt = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    prompt = null;
    notify();
  });
}

/**
 * Opened from the home-screen icon rather than a browser tab. iOS Safari only
 * sets `navigator.standalone`, and older iOS versions don't match the media query.
 * Fixed for the page's life, so it is worked out once.
 */
let installed: boolean | null = null;
export function isRunningInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  installed ??=
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return installed;
}

export function subscribeInstallStore(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getInstallPrompt() {
  return prompt;
}

/**
 * Opens the browser's install dialog. The event can be used once, so it is
 * dropped either way: an accepted install never fires it again, and a cancel
 * hides the card until the browser fires a new one on a later visit.
 */
export async function runInstallPrompt(): Promise<
  'accepted' | 'dismissed' | null
> {
  const event = prompt;
  if (!event) return null;
  prompt = null;
  notify();
  await event.prompt();
  const { outcome } = await event.userChoice;
  return outcome;
}

/** Unavailable storage (a private window, blocked site data) reads as not dismissed. */
export function isInstallCardDismissed(): boolean {
  if (dismissed === null) {
    try {
      dismissed = window.localStorage.getItem(DISMISSED_KEY) !== null;
    } catch {
      dismissed = false;
    }
  }
  return dismissed;
}

/** Forever, on this device - clearing site data is the only way back. */
export function dismissInstallCard() {
  dismissed = true;
  try {
    window.localStorage.setItem(DISMISSED_KEY, new Date().toISOString());
  } catch {
    // Still hidden for this page view.
  }
  notify();
}
