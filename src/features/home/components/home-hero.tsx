import type { ReactNode } from 'react';
import { getLocale, getTranslations } from 'next-intl/server';
import { IconCalendar, IconChevronRight, IconMapPin, IconUsers } from '@tabler/icons-react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import type { EventApp } from '@/features/events/schemas';
import { getHomeEvent, getHomeGuests } from '../queries';
import { countHeads, percent } from '../utils/counts';
import { daysUntil } from '@/lib/date-time';
import { ConfettiBackground } from './confetti';
import { RsvpTriBar } from './rsvp-tri-bar';

function HeroRow({
  icon,
  iconClassName,
  dashed,
  href,
  children,
}: {
  icon: ReactNode;
  iconClassName: string;
  dashed?: 'primary' | 'violet';
  href?: string;
  children: ReactNode;
}) {
  const className = cn(
    'flex min-w-0 flex-1 items-center gap-3 rounded-2xl border px-3 py-2.5',
    dashed === 'violet'
      ? 'border-home-violet bg-home-violet-tint hover:bg-home-violet/20 border-dashed'
      : dashed === 'primary'
        ? 'border-primary/50 bg-primary/5 hover:bg-primary/15 border-dashed'
        : // Wide, the three rows are cells of one card split by dividers, so
          // each loses its own box.
          'bg-primary/[0.03] border-border home-wide:border-transparent home-wide:bg-transparent',
    href &&
      'focus-visible:ring-primary focus-visible:ring-offset-card transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
  );
  const content = (
    <>
      <span
        className={cn(
          'flex size-[38px] shrink-0 items-center justify-center rounded-full',
          iconClassName,
        )}
      >
        {icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-px">{children}</div>
      {href && (
        <IconChevronRight
          className={cn(
            'size-[18px] shrink-0 rtl:rotate-180',
            dashed === 'violet' ? 'text-home-violet' : 'text-primary',
          )}
        />
      )}
    </>
  );
  return (
    // The cell around the row carries the divider between cells when wide.
    <div className="home-wide:px-1.5 home-wide:not-first:border-s home-wide:not-first:border-border flex min-w-0">
      {href ? (
        <Link href={href} className={className}>
          {content}
        </Link>
      ) : (
        <div className={className}>{content}</div>
      )}
    </div>
  );
}

function typeLabelKey(event: EventApp) {
  const key = event.eventType;
  return key === 'wedding' || key === 'henna' || key === 'bar_mitzva' || key === 'bat_mitzva'
    ? key
    : null;
}

/**
 * Home's Hero: identity fused with live status - countdown as the lead number,
 * RSVP progress beside the date and venue on the sheet below.
 */
export async function HomeHero({ eventId }: { eventId: string }) {
  const [t, locale, event, guests] = await Promise.all([
    getTranslations('home.mobile'),
    getLocale(),
    getHomeEvent(eventId),
    getHomeGuests(eventId),
  ]);
  if (!event) return null;

  const heads = countHeads(guests);
  const days = event.eventDate ? daysUntil(event.eventDate) : null;
  const typeKey = typeLabelKey(event);
  const dateText = event.eventDate
    ? new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-GB', {
        dateStyle: 'full',
        timeZone: 'UTC',
      }).format(new Date(event.eventDate))
    : null;

  return (
    // No negative top margin: below `md` the chrome row above this is gone (see
    // `PageCard`), so the section already starts at the top edge of the
    // viewport and the wash below runs off it rather than under a white band.
    // From `md` up the chrome row stays, so the Hero becomes a rounded panel
    // with the wash filling its own bounds instead of bleeding off the page.
    <section className="home-wide:rounded-[28px] relative -mx-4 px-4 pb-0.5 md:mx-0 md:overflow-hidden md:rounded-3xl md:border md:px-0 md:pb-0">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[300px] [mask-image:linear-gradient(180deg,#000_0%,#000_52%,transparent_100%)] md:h-auto md:inset-y-0 md:[mask-image:none]"
        style={{ background: 'var(--home-wash)' }}
      />
      {/* The same two strokes, sized for the phone band... */}
      <svg
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 md:hidden"
        width="240"
        height="210"
        viewBox="0 0 240 210"
        fill="none"
      >
        <path
          d="M-20 34 C60 4 90 84 150 54 S230 24 260 84"
          className="stroke-primary"
          strokeOpacity=".2"
          strokeWidth="1.4"
        />
        <path
          d="M40 200 C70 130 130 160 180 110"
          className="stroke-home-violet"
          strokeOpacity=".15"
          strokeWidth="1.4"
        />
      </svg>
      {/* ...and redrawn to span the panel from `md` up. Stretched to any width,
          so the stroke opts out of scaling to stay a hairline. */}
      <svg
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 hidden h-[240px] w-full md:block"
        viewBox="0 0 1120 240"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          // Ends high on the right so it clears the type label and title (RTL start side).
          d="M-20 60 C140 20 300 130 520 100 S880 10 1140 40"
          className="stroke-primary"
          strokeOpacity=".2"
          strokeWidth="1.4"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M-20 214 C200 150 380 220 620 160 S960 130 1140 190"
          className="stroke-home-violet"
          strokeOpacity=".15"
          strokeWidth="1.4"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {days === 0 && (
        <ConfettiBackground
          className="pointer-events-none absolute inset-x-0 top-0 h-[300px] md:h-auto md:inset-y-0"
          count={30}
        />
      )}

      {/*
        The lead: title and countdown, centered in a band of their own rather
        than sitting right under the status bar now that nothing else is above
        them. `min-h` plus `items-center` is what centers them - the padding is
        symmetric so the middle of the band is the middle of the content, and
        the safe-area inset is added to both the height and the top padding so
        a notch eats into the band instead of into the text.
      */}
      <div className="home-wide:min-h-[176px] home-wide:gap-6 home-wide:px-9 home-wide:pt-[34px] home-wide:pb-[30px] relative flex min-h-[calc(160px+env(safe-area-inset-top))] items-center gap-5 px-1.5 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-6 md:min-h-[160px] md:px-[22px] md:pt-[26px]">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {typeKey && (
            <span className="text-primary text-[13px] font-semibold">
              {t(`typeLabel.${typeKey}`)}
            </span>
          )}
          <h2 className="home-wide:max-w-[680px] home-wide:text-[32px] line-clamp-3 text-[27px] leading-[1.18] font-extrabold tracking-[-0.015em] text-balance">
            {event.title}
          </h2>
        </div>
        {days !== null && days >= 0 && (
          <div className="flex shrink-0 flex-col items-center gap-0.5">
            <span
              dir="ltr"
              className={cn(
                'from-primary to-home-violet bg-gradient-to-br bg-clip-text leading-[0.85] font-extrabold tracking-[-0.05em] text-transparent tabular-nums',
                days === 0
                  ? 'home-wide:text-[54px] text-[44px] tracking-[-0.03em]'
                  : 'home-wide:text-[80px] text-[64px]',
              )}
            >
              {days === 0 ? t('hero.todayTitle') : days}
            </span>
            <span className="text-muted-foreground home-wide:text-[13px] text-[12.5px] font-bold">
              {days === 0 ? t('hero.todaySub') : t('hero.daysLabel', { count: days })}
            </span>
            <span className="bg-primary/40 mt-1 h-0.5 w-8 rounded-full" />
          </div>
        )}
      </div>

      <div className="bg-card border-border home-wide:mx-3.5 home-wide:mb-3.5 home-wide:grid home-wide:grid-cols-3 home-wide:gap-0 home-wide:p-2.5 relative mt-4 flex flex-col gap-2.5 rounded-3xl border p-4 shadow-[0_18px_44px_rgba(26,11,46,0.1)] md:mx-3 md:mt-0 md:mb-3 dark:shadow-[0_18px_44px_rgba(0,0,0,0.35)]">
        {dateText ? (
          <HeroRow
            icon={<IconCalendar className="size-[17px]" />}
            iconClassName="bg-primary/15 text-primary"
          >
            <span className="text-muted-foreground text-[11.5px]">{t('hero.dateLabel')}</span>
            <span className="truncate text-[15px] font-semibold">{dateText}</span>
          </HeroRow>
        ) : (
          <HeroRow
            icon={<IconCalendar className="size-[17px]" />}
            iconClassName="bg-card text-home-violet"
            dashed="violet"
            href={`/app/${eventId}/details`}
          >
            <span className="text-home-violet text-[15px] font-bold">{t('hero.noDateTitle')}</span>
            <span className="text-muted-foreground text-xs">{t('hero.noDateDescription')}</span>
          </HeroRow>
        )}

        <HeroRow
          icon={<IconMapPin className="size-[17px]" />}
          iconClassName="bg-home-violet-tint text-home-violet"
        >
          <span className="text-muted-foreground text-[11.5px]">{t('hero.venueLabel')}</span>
          <span
            className={cn(
              'truncate text-[15px] font-semibold',
              !event.location?.name && 'text-muted-foreground font-medium',
            )}
          >
            {event.location?.name || t('hero.venueMissing')}
          </span>
        </HeroRow>

        {guests.length > 0 ? (
          <HeroRow
            icon={<IconUsers className="size-[17px]" />}
            iconClassName="bg-rsvp-confirmed-tint text-rsvp-confirmed-strong"
          >
            <div className="flex flex-col gap-1">
              <div className="text-muted-foreground flex items-baseline justify-between text-[11.5px]">
                <span>{t('hero.rsvpLabel')}</span>
                <span>{percent(heads.confirmed, heads.total)}%</span>
              </div>
              <span className="text-[15px] font-semibold">
                {t.rich('hero.rsvpLine', {
                  confirmed: heads.confirmed,
                  total: heads.total,
                  b: (chunks) => <b className="text-rsvp-confirmed-strong">{chunks}</b>,
                })}
              </span>
              <RsvpTriBar counts={heads} className="h-[5px]" />
            </div>
          </HeroRow>
        ) : (
          <HeroRow
            icon={<IconUsers className="size-[17px]" />}
            iconClassName="bg-primary/15 text-primary"
            dashed="primary"
            href={`/app/${eventId}/guests`}
          >
            <span className="text-primary text-[15px] font-bold">{t('hero.zeroGuestsTitle')}</span>
            <span className="text-muted-foreground text-xs">{t('hero.zeroGuestsDescription')}</span>
          </HeroRow>
        )}
      </div>
    </section>
  );
}
