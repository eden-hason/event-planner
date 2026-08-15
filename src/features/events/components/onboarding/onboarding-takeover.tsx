'use client';

import { useCallback, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  createDraftEvent,
  publishDraftEvent,
  setDraftDate,
  setDraftEstimate,
  setDraftLocation,
  setDraftNames,
} from '../../actions';
import { updateUserProfile } from '@/features/auth';
import { buildEventTitle } from '../../utils/event-title';
import type { EventTypeKey, Location } from '../../schemas';
import type { DraftEventResume, OnboardingStep } from '../../types';
import type { EventHostNames } from '../../utils/event-title';
import { EventCard, type EventCardData } from './event-card';
import {
  TakeoverBackButton,
  TakeoverLogo,
  TakeoverShell,
} from './takeover-shell';
import { TypeScreen } from './screens/type-screen';
import { NamesScreen } from './screens/names-screen';
import { DateScreen } from './screens/date-screen';
import { VenueScreen } from './screens/venue-screen';
import { EstimateScreen } from './screens/estimate-screen';
import { ProfileScreen } from './screens/profile-screen';
import { WelcomeBackScreen } from './screens/welcome-back-screen';
import { PayoffScreen } from './screens/payoff-screen';

/**
 * The onboarding takeover.
 *
 * One question per screen, and a card that builds as they answer. The event row
 * exists from the type screen onwards, so what the couple watches take shape is
 * the thing they end up with rather than a mock-up of it.
 *
 * Saves happen behind the flow, never in front of it: answering advances the
 * screen immediately and the write follows. The one exception is the type
 * screen, which has to wait for the row it creates before anything can be
 * patched onto it.
 */

const QUESTIONS: readonly OnboardingStep[] = [
  'type',
  'names',
  'date',
  'venue',
  'estimate',
] as const;

type Screen = OnboardingStep | 'profile' | 'welcome' | 'payoff';

type Answers = {
  eventType?: EventTypeKey;
  names: EventHostNames;
  eventDate: string | null;
  noDate: boolean;
  location?: Location;
  guestsEstimate?: number;
};

export function OnboardingTakeover({
  draft,
  profile,
  needsProfile,
  exitHref,
}: {
  /** An unfinished event to resume, if the couple has one. */
  draft: DraftEventResume | null;
  profile: { fullName: string; phoneNumber: string; email: string };
  needsProfile: boolean;
  /**
   * Where "back" leads from the first screen. Set only when there is already a
   * workspace behind the takeover - a first-time couple has nowhere to go back
   * to, and the control is hidden rather than left inert.
   */
  exitHref?: string;
}) {
  const t = useTranslations('onboarding');
  const locale = useLocale();
  const router = useRouter();

  const [answers, setAnswers] = useState<Answers>({
    eventType: (draft?.eventType as EventTypeKey) || undefined,
    names: {
      brideName: draft?.brideName,
      groomName: draft?.groomName,
      childName: draft?.childName,
    },
    eventDate: draft?.eventDate ?? null,
    noDate: !!draft?.answeredDate && !draft.eventDate,
    location: draft?.locationName ? { name: draft.locationName } : undefined,
    guestsEstimate: draft?.guestsEstimate,
  });

  // A returning couple gets the welcome-back frame first, but only once they
  // have something to come back to - a draft that stopped at the type screen
  // has nothing worth showing, so it resumes straight into the questions.
  const [screen, setScreen] = useState<Screen>(() => {
    if (needsProfile) return 'profile';
    if (draft && draft.resumeAt !== 'names') return 'welcome';
    return draft?.resumeAt ?? 'type';
  });
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isPublishing, startPublishing] = useTransition();
  const [isSavingProfile, startSavingProfile] = useTransition();

  /**
   * Answers that failed to save. Onboarding never blocks on a write, so a
   * failure is held here and replayed before publishing rather than being
   * surfaced as an error the couple has to deal with mid-flow.
   */
  const failedSaves = useRef(new Map<OnboardingStep, () => Promise<unknown>>());

  /**
   * Resolves to the Draft Event's id.
   *
   * Everything after the type screen patches a row that screen creates, and a
   * fast answer can land before that insert comes back. Saves await this rather
   * than reading state, so an answer given in the gap is still written instead
   * of being silently dropped.
   */
  const draftIdRef = useRef<Promise<string | null>>(
    Promise.resolve(draft?.eventId ?? null),
  );

  const saveInBackground = useCallback(
    (
      step: OnboardingStep,
      run: (eventId: string) => Promise<{ success: boolean }>,
    ) => {
      failedSaves.current.delete(step);
      const attempt = async () => {
        const id = await draftIdRef.current;
        if (!id) throw new Error('no draft event');
        return run(id);
      };
      void attempt()
        .then((result) => {
          if (!result.success) failedSaves.current.set(step, attempt);
        })
        .catch(() => failedSaves.current.set(step, attempt));
    },
    [],
  );

  const go = useCallback((next: Screen, dir: 1 | -1 = 1) => {
    setDirection(dir);
    setScreen(next);
  }, []);

  /** The screen "back" returns to, or null when this is the first one. */
  const previousScreen = useMemo<Screen | null>(() => {
    const order: Screen[] = [
      'profile',
      'welcome',
      'type',
      'names',
      'date',
      'venue',
      'estimate',
      'payoff',
    ];
    const index = order.indexOf(screen);
    let previous = order[Math.max(0, index - 1)];
    // The welcome frame belongs to a returning couple; a new one never saw it.
    if (previous === 'welcome' && !draft) previous = 'profile';
    if (previous === 'profile' && !needsProfile) previous = 'type';
    return previous === screen ? null : previous;
  }, [screen, draft, needsProfile]);

  const canGoBack = !!previousScreen || !!exitHref;

  const goBack = useCallback(() => {
    if (previousScreen) {
      go(previousScreen, -1);
      return;
    }
    // No screen behind this one, so back means leaving the takeover entirely.
    if (exitHref) router.push(exitHref);
  }, [previousScreen, exitHref, go, router]);

  // --- answers -------------------------------------------------------------

  const handleProfile = ({
    fullName,
    phone,
  }: {
    fullName: string;
    phone: string;
  }) => {
    startSavingProfile(async () => {
      const formData = new FormData();
      formData.set('full_name', fullName);
      formData.set('phone_number', phone.trim());
      // Blocking, unlike the answer saves: this is the account, not the event,
      // and there is no draft row yet to hold it.
      await updateUserProfile(formData);
      // Someone finishing their profile may already have a draft going, in
      // which case they resume it rather than being asked the type again.
      go(draft?.resumeAt ?? 'type');
    });
  };

  const handlePickType = (eventType: EventTypeKey) => {
    setAnswers((a) => ({ ...a, eventType }));
    const created = createDraftEvent(eventType).then((result) => {
      if (result.success && result.eventId) return result.eventId;
      failedSaves.current.set('type', () => createDraftEvent(eventType));
      return null;
    });
    // Later answers await this rather than the rendered state, so one given
    // before the insert returns still lands on the right row.
    draftIdRef.current = created;
    // Advances on its own so the selection is visible before the screen turns.
    window.setTimeout(() => go('names'), 220);
  };

  const handleNames = (names: EventHostNames) => {
    setAnswers((a) => ({ ...a, names }));
    saveInBackground('names', (id) => setDraftNames({ eventId: id, ...names }));
    go('date');
  };

  const handleDate = (isoDate: string) => {
    setAnswers((a) => ({ ...a, eventDate: isoDate, noDate: false }));
    saveInBackground('date', (id) =>
      setDraftDate({ eventId: id, eventDate: isoDate }),
    );
    go('venue');
  };

  const handleNoDate = () => {
    setAnswers((a) => ({ ...a, eventDate: null, noDate: true }));
    // An empty date is the "no date yet" answer, not an unanswered question.
    saveInBackground('date', (id) =>
      setDraftDate({ eventId: id, eventDate: '' }),
    );
    go('venue');
  };

  const handleVenue = (location: Location) => {
    setAnswers((a) => ({ ...a, location }));
    saveInBackground('venue', (id) =>
      setDraftLocation({ eventId: id, location }),
    );
    window.setTimeout(() => go('estimate'), 350);
  };

  const handleNoVenue = () => {
    setAnswers((a) => ({ ...a, location: undefined }));
    saveInBackground('venue', (id) =>
      setDraftLocation({ eventId: id, location: undefined }),
    );
    go('estimate');
  };

  const handleEstimate = (guestsEstimate: number) => {
    setAnswers((a) => ({ ...a, guestsEstimate }));
    saveInBackground('estimate', (id) =>
      setDraftEstimate({ eventId: id, guestsEstimate }),
    );
    go('payoff');
  };

  const handleEnterWorkspace = () => {
    startPublishing(async () => {
      const id = await draftIdRef.current;
      if (!id) return;
      // Replay anything that failed on the way here. This is the one point
      // where every answer has to have landed, so it is the one place worth
      // waiting - and by now the couple is reading the payoff card anyway.
      for (const [step, retry] of failedSaves.current) {
        try {
          await retry();
          failedSaves.current.delete(step);
        } catch {
          // Publishing anyway: a lost venue is not worth trapping them here.
        }
      }
      const result = await publishDraftEvent(id);
      if (result.success) {
        router.replace(`/app/${id}/dashboard`);
      }
    });
  };

  // --- derived -------------------------------------------------------------

  const card: EventCardData = {
    eventType: answers.eventType,
    title: answers.eventType
      ? buildEventTitle(answers.eventType, answers.names, locale) || undefined
      : undefined,
    eventDate: answers.eventDate,
    noDate: answers.noDate,
    venue: answers.location?.name,
  };

  const hasNames = !!(
    answers.names.brideName ||
    answers.names.groomName ||
    answers.names.childName
  );
  const displayNames = [answers.names.brideName, answers.names.groomName]
    .filter(Boolean)
    .join(locale === 'he' ? ' ו' : ' & ');

  const isQuestion = (QUESTIONS as readonly string[]).includes(screen);
  const stepIndex = QUESTIONS.indexOf(screen as OnboardingStep);
  const animation =
    direction >= 0
      ? 'animate-[kt-enter-fwd_0.4s_cubic-bezier(0.16,1,0.3,1)_both]'
      : 'animate-[kt-enter-back_0.4s_cubic-bezier(0.16,1,0.3,1)_both]';

  // --- render --------------------------------------------------------------

  if (screen === 'profile') {
    return (
      <TakeoverShell>
        <header className="flex items-center justify-between px-6 pt-6 md:px-8">
          <span />
          <TakeoverLogo />
        </header>
        <main className="flex flex-1 items-center justify-center px-6 pb-10 md:px-8">
          <div
            className={cn(
              'w-full max-w-[440px]',
              'animate-[kt-enter-fwd_0.4s_cubic-bezier(0.16,1,0.3,1)_both]',
            )}
          >
            <ProfileScreen
              initialFullName={profile.fullName}
              initialPhone={profile.phoneNumber}
              onSubmit={handleProfile}
              pending={isSavingProfile}
            />
          </div>
        </main>
      </TakeoverShell>
    );
  }

  if (screen === 'welcome') {
    return (
      <TakeoverShell>
        <main className="flex flex-1 items-center justify-center px-6 py-10">
          <WelcomeBackScreen
            card={card}
            names={hasNames ? displayNames || answers.names.childName : undefined}
            onResume={() => go(draft?.resumeAt ?? 'names')}
          />
        </main>
      </TakeoverShell>
    );
  }

  if (screen === 'payoff') {
    return (
      <TakeoverShell>
        <main className="flex flex-1 items-center justify-center px-6 py-10">
          <PayoffScreen
            card={card}
            onEnter={handleEnterWorkspace}
            pending={isPublishing}
          />
        </main>
      </TakeoverShell>
    );
  }

  const question = (
    <>
      {screen === 'type' && (
        <TypeScreen selected={answers.eventType} onPick={handlePickType} />
      )}
      {screen === 'names' && answers.eventType && (
        <NamesScreen
          eventType={answers.eventType}
          initial={answers.names}
          onSubmit={handleNames}
          onChange={(names) => setAnswers((a) => ({ ...a, names }))}
        />
      )}
      {screen === 'date' && (
        <DateScreen
          initial={answers.eventDate}
          onSubmit={handleDate}
          onSkip={handleNoDate}
          onChange={(eventDate) =>
            setAnswers((a) => ({ ...a, eventDate, noDate: false }))
          }
        />
      )}
      {screen === 'venue' && (
        <VenueScreen
          initial={answers.location}
          onPick={handleVenue}
          onSkip={handleNoVenue}
          onChange={(location) => setAnswers((a) => ({ ...a, location }))}
        />
      )}
      {screen === 'estimate' && (
        <EstimateScreen
          initial={answers.guestsEstimate}
          onFinish={handleEstimate}
          onChange={(guestsEstimate) =>
            setAnswers((a) => ({ ...a, guestsEstimate }))
          }
        />
      )}
    </>
  );

  return (
    <TakeoverShell>
      <header className="flex items-center justify-between gap-3 px-6 pt-5 lg:px-10">
        {canGoBack ? (
          <TakeoverBackButton onClick={goBack} label={t('back')} />
        ) : (
          <span className="size-10" />
        )}
        {/* The step count rides with the two-column layout; the single-column
            one leans on the card above the question to show progress. */}
        {isQuestion && (
          <span className="hidden text-[12.5px] font-semibold text-[var(--kt-ink-faint)] lg:inline">
            {t('step', { current: stepIndex + 1, total: QUESTIONS.length })}
          </span>
        )}
        <TakeoverLogo />
      </header>

      {/* The two columns are sized, not stretched: a question track that takes
          all the leftover width would leave the pair stranded against one edge
          of a wide screen. `justify-center` centres the tracks instead. The
          split waits for `lg` because the card alone is 420px - at 768px there
          is nothing left for the question to live in. */}
      <main className="flex flex-1 flex-col px-6 pb-10 lg:grid lg:grid-cols-[minmax(0,520px)_420px] lg:items-center lg:justify-center lg:gap-10 lg:px-10 lg:py-6 xl:gap-14">
        {/* Mobile: the card is a compact strip above the question, gaining a
            line with each answer. It must never crowd the question, hence the
            bottom margin - on a tall screen like the estimate the question
            track has no slack left to centre itself in, so its heading would
            otherwise start right under the card. */}
        {answers.eventType && (
          <div className="mx-auto mt-3.5 mb-5 w-full max-w-[520px] animate-[kt-card-bloom_0.5s_cubic-bezier(0.16,1,0.3,1)_both] lg:hidden">
            <EventCard data={card} size="strip" />
          </div>
        )}

        <div
          key={screen}
          className={cn(
            'mx-auto flex w-full max-w-[520px] flex-1 flex-col justify-center gap-1.5 lg:flex-none',
            animation,
          )}
        >
          {question}
        </div>

        {/* Desktop: full-size beside the question throughout. */}
        <div className="hidden flex-col gap-3.5 self-center lg:flex">
          {answers.eventType ? (
            <>
              <div className="animate-[kt-card-bloom_0.5s_cubic-bezier(0.16,1,0.3,1)_both]">
                <EventCard data={card} size="full" />
              </div>
              <p className="text-center text-[12.5px] text-[var(--kt-ink-faint)]">
                {t('cardBuilding')}
              </p>
            </>
          ) : (
            <div className="rounded-3xl border-[1.5px] border-dashed border-[rgba(26,11,46,0.12)] bg-white/50 px-7 py-11 text-center text-[var(--kt-ink-ghost)]">
              <div className="text-[15px] font-semibold">
                {t('cardPlaceholderTitle')}
              </div>
              <div className="mt-1 text-[12.5px]">
                {t('cardPlaceholderSubtitle')}
              </div>
            </div>
          )}
        </div>
      </main>
    </TakeoverShell>
  );
}
