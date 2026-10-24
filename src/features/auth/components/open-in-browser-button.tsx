'use client';

import { useTranslations } from 'next-intl';
import { systemBrowserUrl } from '@/lib/in-app-browser';
import { GoogleIcon } from '@/components/icons';

/**
 * Google sign-in from inside an app's own browser, where Google refuses an
 * embedded WebView: the Google button becomes a way out to the phone's real
 * browser, at this same page, where Google works. The hint underneath covers
 * an app that swallows the link, and a platform with no link to offer.
 */
export function OpenInBrowserButton({
  platform,
}: {
  platform: 'android' | 'ios' | 'other';
}) {
  const t = useTranslations('auth');

  // Built on tap rather than render: the page's own URL, query and all, is
  // only known in the browser.
  const openInBrowser = () => {
    const url = systemBrowserUrl(window.location.href, platform);
    if (url) window.location.href = url;
  };

  return (
    <>
      {platform !== 'other' && (
        <button
          type="button"
          onClick={openInBrowser}
          className="flex h-[54px] cursor-pointer items-center justify-center gap-2.5 rounded-2xl border-[1.5px] border-[var(--kt-border)] bg-white text-[15px] font-semibold text-[var(--kt-ink)] transition-colors hover:border-[rgba(26,11,46,0.22)]"
        >
          <GoogleIcon />
          {t('googleInBrowser')}
        </button>
      )}
      <p className="text-center text-[13px] leading-relaxed text-pretty text-[var(--kt-ink-faint)]">
        {t('inAppGoogleHint')}
      </p>
    </>
  );
}
