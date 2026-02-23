'use client';

import { motion } from 'motion/react';
import { PartyPopper } from 'lucide-react';

export function HeroContent() {
  return (
    <div className="space-y-6 text-center">
      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="flex items-center justify-center gap-4 text-6xl font-bold tracking-tight text-white md:text-8xl"
      >
        <PartyPopper className="size-12 text-white md:size-16" />
        Kululu
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }}
        className="text-xl font-light text-white/90 md:text-2xl"
        dir="rtl"
      >
        ניהול אירוע ומוזמנים בקלות
      </motion.p>
      <motion.span
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 1 }}
        className="mt-2 inline-block rounded-full bg-white/20 px-5 py-1.5 text-sm font-medium tracking-wide text-white/90 backdrop-blur-sm"
      >
        בקרוב
      </motion.span>
    </div>
  );
}
