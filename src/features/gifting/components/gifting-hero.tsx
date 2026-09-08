'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';

export function GiftingHero({ connectedCount }: { connectedCount: number }) {
  const t = useTranslations('gifting.hero');

  return (
    <section
      aria-labelledby="gifting-hero-title"
      className="hidden items-center gap-6 rounded-2xl bg-primary/10 p-6 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:gap-10 md:p-8"
    >
      <div className="flex max-w-xl flex-col gap-3">
        <h2
          id="gifting-hero-title"
          className="text-3xl font-semibold tracking-tight text-balance md:text-[2.75rem] md:leading-[1.05]"
        >
          {t('heading')}
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground text-pretty">
          {t('body')}
        </p>
        {connectedCount > 0 && (
          <span className="mt-1 text-xs text-primary/80">
            {t('summaryConnected', { count: connectedCount })}
          </span>
        )}
      </div>

      <Image
        src="/gifting-hero.svg"
        alt=""
        width={200}
        height={200}
        className="size-36 shrink-0 object-contain md:size-48"
      />
    </section>
  );
}
