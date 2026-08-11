import type { Metadata } from 'next';
import { Geist, Geist_Mono, Plus_Jakarta_Sans, Heebo, Rubik, Assistant } from 'next/font/google';
import { getLocale } from 'next-intl/server';
import { Toaster } from 'sonner';
import { Analytics } from '@vercel/analytics/react';
import ogPreview from '@/assets/og-preview.png';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: '--font-plus-jakarta',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

const heebo = Heebo({
  variable: '--font-heebo',
  subsets: ['latin', 'hebrew'],
  weight: ['500', '700'],
});

const rubik = Rubik({
  variable: '--font-rubik',
  subsets: ['latin', 'hebrew'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
});

const assistant = Assistant({
  variable: '--font-assistant',
  subsets: ['latin', 'hebrew'],
  weight: ['200', '300', '400', '500', '600', '700', '800'],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.NEXT_PUBLIC_VERCEL_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    : 'http://localhost:3000');

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Kululu אישורי הגעה',
  description: 'תכננו, ארגנו ונהלו את האירוע שלכם בקלות עם אפליקציית ניהול האירועים המשותפת שלנו',
  openGraph: {
    title: 'Kululu אישורי הגעה',
    description: 'תכננו, ארגנו ונהלו את האירוע שלכם בקלות עם אפליקציית ניהול האירועים המשותפת שלנו',
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
    description: 'תכננו, ארגנו ונהלו את האירוע שלכם בקלות עם אפליקציית ניהול האירועים המשותפת שלנו',
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
