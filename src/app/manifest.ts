import type { MetadataRoute } from 'next';

/**
 * What Android uses when the app is added to the home screen: without a
 * manifest it falls back to a screenshot-like letter tile instead of the logo.
 * iOS ignores the icons here and reads `apple-icon.png` beside this file.
 * `standalone` opens it without the browser's address bar, like an app.
 * The maskable icon keeps the mark inside the 80% safe zone, so a launcher's
 * circle or squircle crop never clips it.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Kululu אישורי הגעה',
    short_name: 'Kululu',
    start_url: '/',
    display: 'standalone',
    background_color: '#e7e0ec',
    theme_color: '#e7e0ec',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
