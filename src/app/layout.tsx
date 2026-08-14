import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { getLocale } from 'next-intl/server';
import { Toaster } from 'sonner';
import { Analytics } from '@vercel/analytics/react';
import ogPreview from '@/assets/og-preview.png';
import './globals.css';

// Self-hosted rather than next/font/google: that loader downloads every family
// from fonts.gstatic.com during the build, which made deploys fail whenever a
// fetch flaked. These are the upstream variable fonts, subset to the scripts we
// actually render - see src/assets/fonts/OFL.txt for provenance and licensing.
//
// Each file carries its whole weight axis, so a single woff2 replaces what used
// to be one download per weight. The `weight` range below must stay within the
// font's real axis or the browser will synthesise the extremes.

const geistSans = localFont({
  src: '../assets/fonts/geist-variable.woff2',
  variable: '--font-geist-sans',
  weight: '100 900',
  display: 'swap',
});

const geistMono = localFont({
  src: '../assets/fonts/geist-mono-variable.woff2',
  variable: '--font-geist-mono',
  weight: '100 900',
  display: 'swap',
});

const plusJakarta = localFont({
  src: '../assets/fonts/plus-jakarta-sans-variable.woff2',
  variable: '--font-plus-jakarta',
  weight: '200 800',
  display: 'swap',
});

const heebo = localFont({
  src: '../assets/fonts/heebo-variable.woff2',
  variable: '--font-heebo',
  weight: '100 900',
  display: 'swap',
});

const rubik = localFont({
  src: '../assets/fonts/rubik-variable.woff2',
  variable: '--font-rubik',
  weight: '300 900',
  display: 'swap',
});

const assistant = localFont({
  src: '../assets/fonts/assistant-variable.woff2',
  variable: '--font-assistant',
  weight: '200 800',
  display: 'swap',
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.NEXT_PUBLIC_VERCEL_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    : 'http://localhost:3000');

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Kululu אישורי הגעה',
  description: 'Kululu - מערכת אחת לניהול אירועים ואישורי הגעה',
  openGraph: {
    title: 'Kululu אישורי הגעה',
    description: 'Kululu - מערכת אחת לניהול אירועים ואישורי הגעה',
    siteName: 'Kululu אישורי הגעה',
    type: 'website',
    images: [
      {
        url: ogPreview.src,
        width: ogPreview.width,
        height: ogPreview.height,
        alt: 'Kululu',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kululu אישורי הגעה',
    description: 'Kululu - מערכת אחת לניהול אירועים ואישורי הגעה',
    images: [ogPreview.src],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const dir = locale === 'he' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir}>
      <body className={`${geistSans.variable} ${geistMono.variable} ${plusJakarta.variable} ${heebo.variable} ${rubik.variable} ${assistant.variable} antialiased`}>
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
