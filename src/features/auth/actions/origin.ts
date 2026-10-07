import { headers } from 'next/headers';

/**
 * The origin this request arrived on, for OAuth redirect URLs. Behind Vercel's
 * proxy the host is in `x-forwarded-host`. Not a Server Action - deliberately
 * outside the `'use server'` files, which would expose it to the browser.
 */
export async function requestOrigin(): Promise<string> {
  const headersList = await headers();
  const host =
    headersList.get('x-forwarded-host') ||
    headersList.get('host') ||
    'localhost:3000';
  const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  return `${isLocal ? 'http' : 'https'}://${host}`;
}
