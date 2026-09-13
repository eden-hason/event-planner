import { Suspense, type ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { HomeHero } from './home-hero';
import { FeaturedActionsSection } from './featured-actions-section';
import { StatusStripSection } from './status-strip-section';
import {
  GroupEngagementCard,
  GroupHeadsCard,
  RecentActivityCard,
  RsvpDonutCard,
} from './analytics-cards';
import { SectionErrorBoundary } from './section-boundary';
import { CardSkeleton, HeroSkeleton, ListSkeleton } from './skeletons';

async function SectionError() {
  const t = await getTranslations('home.mobile');
  return (
    <p className="bg-card border-border text-muted-foreground rounded-2xl border px-4 py-5 text-center text-[13px]">
      {t('sectionError')}
    </p>
  );
}

function Section({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  return (
    <SectionErrorBoundary fallback={<SectionError />}>
      <Suspense fallback={fallback}>{children}</Suspense>
    </SectionErrorBoundary>
  );
}

/**
 * Home below `md`: Hero, Featured Actions, the status strip, then the RSVP
 * analytics. Each section streams on its own so a slow query only holds back
 * the section that needs it.
 */
export function HomeMobile({ eventId }: { eventId: string }) {
  return (
    <div className="flex flex-col gap-[22px] pb-3.5">
      <Section fallback={<HeroSkeleton />}>
        <HomeHero eventId={eventId} />
      </Section>
      <Section fallback={<ListSkeleton />}>
        <FeaturedActionsSection eventId={eventId} />
      </Section>
      <Section fallback={<ListSkeleton rows={1} />}>
        <StatusStripSection eventId={eventId} />
      </Section>
      <Section fallback={<CardSkeleton height={176} />}>
        <RsvpDonutCard eventId={eventId} />
      </Section>
      <Section fallback={<CardSkeleton />}>
        <GroupEngagementCard eventId={eventId} />
      </Section>
      <Section fallback={<CardSkeleton />}>
        <GroupHeadsCard eventId={eventId} />
      </Section>
      <Section fallback={<CardSkeleton height={220} />}>
        <RecentActivityCard eventId={eventId} />
      </Section>
    </div>
  );
}
