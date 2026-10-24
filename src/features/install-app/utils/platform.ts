import { IN_APP_BROWSER_UA } from '@/lib/in-app-browser';
import type { InstallPlatform } from '../types';

/** iOS browsers other than Safari and Chrome. They get no card. */
const OTHER_IOS_BROWSER = /FxiOS|EdgiOS|OPiOS|OPT\/|Ddg\/|YaBrowser/;

/**
 * iPadOS Safari reports a Mac by default, so a Mac with a touch screen is an iPad.
 * `maxTouchPoints` is what tells them apart: a real Mac reports 0.
 */
function isIos(userAgent: string, maxTouchPoints: number): boolean {
  return (
    /iPhone|iPad|iPod/.test(userAgent) ||
    (/Macintosh/.test(userAgent) && maxTouchPoints > 1)
  );
}

/**
 * Which install path, if any, this browser offers.
 *
 * Android is only a candidate: the card shows once the browser has fired
 * `beforeinstallprompt`, which Firefox and in-app browsers never do. On iOS
 * every browser runs on WebKit, so each is told apart by the token it adds to
 * the user agent; Safari is what is left once all of them are ruled out.
 * Apple's in-app browser window (opened by Gmail, Telegram and others) reports
 * itself as Safari and can't be told apart - a known gap.
 */
export function detectInstallPlatform(
  userAgent: string,
  maxTouchPoints: number,
): InstallPlatform {
  // Nothing can be added to the home screen from inside an app's own browser,
  // so the Install Card stays away (install-card-plan.md).
  if (IN_APP_BROWSER_UA.test(userAgent)) return 'none';

  if (/Android/i.test(userAgent)) return 'android';

  if (!isIos(userAgent, maxTouchPoints)) return 'none';
  if (/CriOS\//.test(userAgent)) return 'ios-chrome';
  if (OTHER_IOS_BROWSER.test(userAgent)) return 'none';
  // A web view embedded in an app has no `Safari/` token.
  if (/Version\/[\d.]+.*Safari\//.test(userAgent)) return 'ios-safari';
  return 'none';
}
