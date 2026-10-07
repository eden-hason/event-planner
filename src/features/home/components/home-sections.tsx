import { Suspense, type ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { SaveEventPill } from '@/features/auth';
import { HomeHero } from './home-hero';
import { FeaturedActionsSection } from './featured-actions-section';
import { StatusStripSection } from './status-strip-section';
import {
  AnswerSourcesCard,
  GroupEngagementCard,
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
 * Home at every width: Hero, Featured Actions, the status strip, then the RSVP
 * analytics. Each section streams on its own so a slow query only holds back
 * the section that needs it.
 *
 * One tree for phone and desktop. From `md` up this wrapper caps the content
 * at 1120px and declares the `home` container, and the sections re-flow with
 * the `home-wide:` variant once that container is wide enough (see
 * `globals.css`) - so the switch follows the sidebar, not just the viewport.
 */
export function HomeSections({ eventId }: { eventId: string }) {
  return (
    <div className="md:@container/home pb-3.5 md:mx-auto md:w-full md:max-w-[1120px] md:pb-0">
      <div className="home-wide:gap-7 flex flex-col gap-[22px]">
        {/* Home has no header row on the phone, so a Visitor's save pill
            (ADR 0028) stands here instead. Nothing for an Owner. */}
        <SaveEventPill className="self-end md:hidden" />
        <Section fallback={<HeroSkeleton />}>
          <HomeHero eventId={eventId} />
        </Section>
        <Section fallback={<ListSkeleton />}>
          <FeaturedActionsSection eventId={eventId} />
        </Section>
        <Section fallback={<ListSkeleton rows={1} />}>
          <StatusStripSection eventId={eventId} />
        </Section>
        {/* Row pairs from wide up: the two compact summaries, then the two lists.
            Top-aligned, so expanding one card's rows never stretches its neighbour. */}
        <div className="home-wide:grid home-wide:grid-cols-2 home-wide:items-start home-wide:gap-3 flex flex-col gap-[22px]">
          <Section fallback={<CardSkeleton height={176} />}>
            <RsvpDonutCard eventId={eventId} />
          </Section>
          <Section fallback={<CardSkeleton height={176} />}>
            <AnswerSourcesCard eventId={eventId} />
          </Section>
          <Section fallback={<CardSkeleton />}>
            <GroupEngagementCard eventId={eventId} />
          </Section>
          <Section fallback={<CardSkeleton height={220} />}>
            <RecentActivityCard eventId={eventId} />
          </Section>
        </div>
      </div>
    </div>
  );
}
