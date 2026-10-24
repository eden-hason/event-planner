/**
 * Apps that open links in a browser of their own - a WebView inside the app
 * rather than Safari or Chrome. Two things break there: Google refuses to sign
 * anyone in from an embedded WebView (`disallowed_useragent`), and the page's
 * cookies live in the app's own jar, apart from the phone's real browser.
 */
export const IN_APP_BROWSER_UA =
  /FBAN|FBAV|FBIOS|Instagram|Line\/|GSA\/|Twitter|LinkedInApp|Snapchat|musical_ly|BytedanceWebview|WhatsApp/i;

/** Android marks its system WebView with `; wv)` in the device block. */
const ANDROID_WEBVIEW_UA = /;\s*wv\)/;

/** Chromium WebViews that send client hints name themselves as a brand. */
const ANDROID_WEBVIEW_BRAND = /"Android WebView"/;

/**
 * The platform of the in-app browser this request comes from, or null when it
 * is a real browser. The platform decides how to get out: Android can hand
 * the page to Chrome with an intent, iOS can only be asked to open Safari.
 *
 * Apple's in-app browser window (SFSafariViewController, opened by Gmail,
 * Telegram and others) reports itself as Safari and can't be told apart - but
 * Google allows sign-in there, so missing it costs nothing.
 */
export function detectInAppBrowser(
  userAgent: string | null,
  secChUa?: string | null,
): 'android' | 'ios' | 'other' | null {
  if (!userAgent) return null;
  const isAndroid = /Android/i.test(userAgent);
  const isWebView =
    IN_APP_BROWSER_UA.test(userAgent) ||
    (isAndroid &&
      (ANDROID_WEBVIEW_UA.test(userAgent) || ANDROID_WEBVIEW_BRAND.test(secChUa ?? '')));
  if (!isWebView) return null;
  if (isAndroid) return 'android';
  if (/iPhone|iPad|iPod/.test(userAgent)) return 'ios';
  return 'other';
}

/**
 * A link that reopens `url` in the phone's own browser, or null when the
 * platform has no way to ask for one.
 *
 * Android: an intent naming Chrome, which in-app browsers hand to the system;
 * if Chrome is missing, the fallback reloads the page where it is. iOS:
 * `x-safari-https://` opens Safari on recent iOS, but an app may swallow it, so
 * the page always says how to do it by hand as well.
 */
export function systemBrowserUrl(
  url: string,
  platform: 'android' | 'ios' | 'other',
): string | null {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') return null;
  // No fragment: the intent's own syntax starts at the first `#`.
  const rest = `${parsed.host}${parsed.pathname}${parsed.search}`;
  if (platform === 'android') {
    return `intent://${rest}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`;
  }
  if (platform === 'ios') return `x-safari-https://${rest}`;
  return null;
}
