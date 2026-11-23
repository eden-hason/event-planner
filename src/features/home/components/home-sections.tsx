import { Suspense, type ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';
import { HomeHero } from './home-hero';
import { FeaturedActionsSection } from './featured-actions-section';
import { StatusStripSection } from './status-strip-section';
import {
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

function Section({
  fallback,
  className,
  children,
}: {
  fallback: ReactNode;
  /** Wraps the section in a box that its card (or skeleton) fills, for grid placement. */
  className?: string;
  children: ReactNode;
}) {
  const section = (
    <SectionErrorBoundary fallback={<SectionError />}>
      <Suspense fallback={fallback}>{children}</Suspense>
    </SectionErrorBoundary>
  );
  return className ? (
    <div className={cn('flex flex-col *:flex-1', className)}>{section}</div>
  ) : (
    section
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
    <div className="pb-3.5 md:@container/home md:mx-auto md:w-full md:max-w-[1120px] md:pb-0">
      <div className="home-wide:gap-7 flex flex-col gap-[22px]">
        <Section fallback={<HeroSkeleton />}>
          <HomeHero eventId={eventId} />
        </Section>
        <Section fallback={<ListSkeleton />}>
          <FeaturedActionsSection eventId={eventId} />
        </Section>
        <Section fallback={<ListSkeleton rows={1} />}>
          <StatusStripSection eventId={eventId} />
        </Section>
        {/* A bento from wide up: the RSVP donut over the group breakdown in the
            start column, Recent Activity filling the whole end column. Every
            card fills its cell so both columns share one top and bottom edge;
            the donut keeps its natural height and the group card's `1fr` row
            takes up any difference. Expanding the group rows grows the
            activity card with it rather than leaving a hole. */}
        <div className="home-wide:grid home-wide:grid-cols-2 home-wide:grid-rows-[auto_1fr] home-wide:gap-3 flex flex-col gap-[22px]">
          <Section
            className="home-wide:col-start-1 home-wide:row-start-1"
            fallback={<CardSkeleton height={176} />}
          >
            <RsvpDonutCard eventId={eventId} />
          </Section>
          <Section
            className="home-wide:col-start-1 home-wide:row-start-2"
            fallback={<CardSkeleton />}
          >
            <GroupEngagementCard eventId={eventId} />
          </Section>
          <Section
            className="home-wide:col-start-2 home-wide:row-span-2 home-wide:row-start-1"
            fallback={<CardSkeleton height={220} />}
          >
            <RecentActivityCard eventId={eventId} />
          </Section>
        </div>
      </div>
    </div>
  );
}
