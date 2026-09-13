import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Live Invite Preview Link: the /c/[token] page, which resolves an event's
// preview token to a sample guest. This path exists so a link an Owner shares
// reads as a preview, and keeps it out of search results.
export { default } from '../../c/[token]/page';
