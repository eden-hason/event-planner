import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { detectInstallPlatform } from './platform';

const UA = {
  iphoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
  iphoneChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0.7390.96 Mobile/15E148 Safari/604.1',
  iphoneFirefox:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/143.0 Mobile/15E148 Safari/605.1.15',
  iphoneEdge:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 EdgiOS/141.0.3537.71 Mobile/15E148 Safari/605.1.15',
  iphoneInstagram:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 400.0.0.0.0 (iPhone15,2; iOS 18_6; he_IL; he)',
  iphoneFacebook:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/500.0.0.0;FBBV/1;FBDV/iPhone15,2;FBMD/iPhone;FBSN/iOS;FBSV/18.6;FBSS/3;FBLC/he_IL]',
  iphoneGoogleApp:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/390.0.0 Mobile/15E148 Safari/604.1',
  iphoneWebView:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  ipadDesktopSafari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
  androidSamsung:
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0.0.0 Mobile Safari/537.36',
  androidInstagram:
    'Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/141.0.0.0 Mobile Safari/537.36 Instagram 400.0.0.0.0 Android',
  desktopChrome:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  windowsEdge:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0',
};

describe('detectInstallPlatform', () => {
  it('tells Safari and Chrome on iPhone apart', () => {
    assert.equal(detectInstallPlatform(UA.iphoneSafari, 5), 'ios-safari');
    assert.equal(detectInstallPlatform(UA.iphoneChrome, 5), 'ios-chrome');
  });

  it('offers nothing in other iOS browsers', () => {
    assert.equal(detectInstallPlatform(UA.iphoneFirefox, 5), 'none');
    assert.equal(detectInstallPlatform(UA.iphoneEdge, 5), 'none');
  });

  it('offers nothing inside an app', () => {
    assert.equal(detectInstallPlatform(UA.iphoneInstagram, 5), 'none');
    assert.equal(detectInstallPlatform(UA.iphoneFacebook, 5), 'none');
    assert.equal(detectInstallPlatform(UA.iphoneGoogleApp, 5), 'none');
    assert.equal(detectInstallPlatform(UA.iphoneWebView, 5), 'none');
    assert.equal(detectInstallPlatform(UA.androidInstagram, 5), 'none');
  });

  it('treats a Mac with a touch screen as an iPad', () => {
    assert.equal(detectInstallPlatform(UA.ipadDesktopSafari, 5), 'ios-safari');
    assert.equal(detectInstallPlatform(UA.ipadDesktopSafari, 0), 'none');
  });

  it('makes any Android browser a candidate', () => {
    assert.equal(detectInstallPlatform(UA.androidChrome, 5), 'android');
    assert.equal(detectInstallPlatform(UA.androidSamsung, 5), 'android');
  });

  it('offers nothing on desktop, even where the browser could install', () => {
    assert.equal(detectInstallPlatform(UA.desktopChrome, 0), 'none');
    assert.equal(detectInstallPlatform(UA.windowsEdge, 0), 'none');
  });
});
