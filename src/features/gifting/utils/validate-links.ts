/**
 * Link validation for the two digital-gifting providers. Pure and
 * dependency-free so client components (inline field validation) and the
 * server action (defence in depth) can share it.
 *
 * PayBox links have shipped under a few hosts over the years - the Firebase
 * dynamic link `payboxapp.page.link` and the newer `links.payboxapp.com` /
 * `link.payboxapp.com` - so the host check is deliberately loose. Bit only
 * ever uses `bitpay.co.il`.
 */

export type LinkError = 'empty' | 'notUrl' | 'wrongProvider';

const PAYBOX_HOST_RE = /^([a-z0-9-]+\.)*payboxapp\.(com|page\.link)$/i;
const BIT_HOST_RE = /^([a-z0-9-]+\.)*bitpay\.co\.il$/i;

function parseHttpsUrl(value: string): URL | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:') return null;
    return url;
  } catch {
    return null;
  }
}

export function validatePayboxLink(value: string): LinkError | null {
  if (!value.trim()) return 'empty';
  const url = parseHttpsUrl(value);
  if (!url) return 'notUrl';
  if (!PAYBOX_HOST_RE.test(url.hostname) || url.pathname === '/') {
    return 'wrongProvider';
  }
  return null;
}

export function validateBitLink(value: string): LinkError | null {
  if (!value.trim()) return 'empty';
  const url = parseHttpsUrl(value);
  if (!url) return 'notUrl';
  if (!BIT_HOST_RE.test(url.hostname) || url.pathname === '/') {
    return 'wrongProvider';
  }
  return null;
}

export function isValidPayboxLink(value: string): boolean {
  return validatePayboxLink(value) === null;
}

export function isValidBitLink(value: string): boolean {
  return validateBitLink(value) === null;
}
