import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import {
  GOOGLE_REVIEW_URL,
  KULULU_WHATSAPP_NUMBER,
  REVIEW_PATH,
  SUPPORT_PATH,
} from './src/lib/config/contact';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Baileys (WhatsApp guest import, backlog 0017) is ESM-only with optional
  // native dependencies; it is loaded from node_modules at runtime rather than
  // bundled.
  serverExternalPackages: ['baileys'],
  // Short links in the Owner Messages (ADR 0039). Run before the proxy, so the
  // intl routing never sees them. Temporary (307) so a destination can change
  // without browsers having cached the old one.
  async redirects() {
    return [
      {
        source: SUPPORT_PATH,
        destination: `https://wa.me/${KULULU_WHATSAPP_NUMBER}`,
        permanent: false,
      },
      { source: REVIEW_PATH, destination: GOOGLE_REVIEW_URL, permanent: false },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default withNextIntl(nextConfig);
