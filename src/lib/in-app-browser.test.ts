import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { detectInAppBrowser, systemBrowserUrl } from './in-app-browser';

const UA = {
  iphoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
  iphoneChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0.7390.96 Mobile/15E148 Safari/604.1',
  iphoneInstagram:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 400.0.0.0.0 (iPhone15,2; iOS 18_6; he_IL; he)',
  iphoneFacebook:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/500.0.0.0;FBBV/1;FBDV/iPhone15,2;FBMD/iPhone;FBSN/iOS;FBSV/18.6;FBSS/3;FBLC/he_IL]',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
  androidInstagram:
    'Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/141.0.0.0 Mobile Safari/537.36 Instagram 400.0.0.0.0 Android',
  androidUnknownWebView:
    'Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/141.0.0.0 Mobile Safari/537.36',
  desktopChrome:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
};

describe('detectInAppBrowser', () => {
  it('leaves real browsers alone', () => {
    assert.equal(detectInAppBrowser(UA.iphoneSafari), null);
    assert.equal(detectInAppBrowser(UA.iphoneChrome), null);
    assert.equal(detectInAppBrowser(UA.androidChrome), null);
    assert.equal(detectInAppBrowser(UA.desktopChrome), null);
    assert.equal(detectInAppBrowser(null), null);
  });

  it('names the platform of an app browser', () => {
    assert.equal(detectInAppBrowser(UA.iphoneInstagram), 'ios');
    assert.equal(detectInAppBrowser(UA.iphoneFacebook), 'ios');
    assert.equal(detectInAppBrowser(UA.androidInstagram), 'android');
  });

  it('catches an Android WebView by its marker or its client hint', () => {
    assert.equal(detectInAppBrowser(UA.androidUnknownWebView), 'android');
    assert.equal(
      detectInAppBrowser(UA.androidChrome, '"Android WebView";v="141", "Chromium";v="141"'),
      'android',
    );
    assert.equal(
      detectInAppBrowser(UA.androidChrome, '"Google Chrome";v="141", "Chromium";v="141"'),
      null,
    );
  });
});

describe('systemBrowserUrl', () => {
  const url = 'https://kululu.co.il/login?next=%2Fapp';

  it('hands Android the page in Chrome, falling back to itself', () => {
    assert.equal(
      systemBrowserUrl(url, 'android'),
      `intent://kululu.co.il/login?next=%2Fapp#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`,
    );
  });

  it('asks iOS for Safari', () => {
    assert.equal(systemBrowserUrl(url, 'ios'), 'x-safari-https://kululu.co.il/login?next=%2Fapp');
  });

  it('drops the fragment, which would end the intent early', () => {
    assert.equal(
      systemBrowserUrl('https://kululu.co.il/login#x', 'ios'),
      'x-safari-https://kululu.co.il/login',
    );
  });

  it('offers nothing it cannot open', () => {
    assert.equal(systemBrowserUrl(url, 'other'), null);
    assert.equal(systemBrowserUrl('http://localhost:3000/login', 'ios'), null);
  });
});
