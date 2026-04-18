import { setRequestLocale } from 'next-intl/server';
import { SpaceBackground } from '@/components/space-background';
import { HeroContent } from '@/components/hero-content';

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="relative flex h-screen flex-col overflow-hidden">
      <SpaceBackground />

      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Center Content */}
      <main className="relative z-10 -mt-32 flex flex-1 items-center justify-center">
        <HeroContent />
      </main>
    </div>
  );
}
