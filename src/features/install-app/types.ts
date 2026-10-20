// TypeScript-only types for the install-app feature.

/**
 * How this browser can add Kululu to the home screen: Android through the
 * browser's own install dialog, iOS through our instructions drawer, worded for
 * the browser it was detected in.
 */
export type InstallPlatform = 'android' | 'ios-safari' | 'ios-chrome' | 'none';

/** Where an install offer was shown, for analytics. */
export type InstallSurface = 'home' | 'more';

/** What turned the Install Card off for good on this device. */
export type DismissVia = 'x' | 'done';

/**
 * The event Chromium browsers fire when the site can be installed. Not in the
 * DOM typings because it is not a web standard.
 */
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}
