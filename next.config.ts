import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { KULULU_WHATSAPP_NUMBER, SUPPORT_PATH } from './src/lib/config/contact';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Baileys (WhatsApp guest import, backlog 0017) is ESM-only with optional
  // native dependencies; it is loaded from node_modules at runtime rather than
  // bundled.
  serverExternalPackages: ['baileys'],
  // Runs before the proxy, so the intl routing never sees it. Temporary (307) so
  // the number can change without browsers having cached the old one.
  async redirects() {
    return [
      {
        source: SUPPORT_PATH,
        destination: `https://wa.me/${KULULU_WHATSAPP_NUMBER}`,
        permanent: false,
      },
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
