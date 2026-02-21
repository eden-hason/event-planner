import { PartyPopper } from 'lucide-react';

export default function Home() {
  return (
    <div
      className="h-screen bg-cover bg-center bg-no-repeat flex flex-col relative"
      style={{ backgroundImage: 'url(/landing_page_hero.png)' }}
    >
      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Center Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center -mt-32">
        <div className="text-center space-y-6">
          <h1 className="text-6xl md:text-8xl font-bold text-white tracking-tight flex items-center justify-center gap-4">
            <PartyPopper className="size-12 md:size-16 text-white" />
            Kululu
          </h1>
          <p className="text-xl md:text-2xl text-white/90 font-light" dir="rtl">
            ניהול אירועים בצורה הכי קלה שיש
          </p>
          <span className="inline-block mt-2 px-5 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white/90 text-sm font-medium tracking-wide">
            בקרוב
          </span>
        </div>
      </main>
    </div>
  );
}
