import type { ReactNode } from 'react';
import { getLocale, getTranslations } from 'next-intl/server';
import { IconCalendar, IconChevronRight, IconMapPin, IconUsers } from '@tabler/icons-react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import type { EventApp } from '@/features/events/schemas';
import { getHomeEvent, getHomeGuests } from '../../queries';
import { countHeads, percent } from '../../utils/counts';
import { daysUntil } from '@/lib/date-time';
import { ConfettiBackground } from '../confetti';
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
    'flex items-center gap-3 rounded-2xl border px-3 py-2.5',
    dashed === 'violet'
      ? 'border-home-violet bg-home-violet-tint border-dashed'
      : dashed === 'primary'
        ? 'border-primary/50 bg-primary/5 border-dashed'
        : 'bg-primary/[0.03] border-border',
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
  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
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
    <section className="relative -mx-4 px-4 pb-0.5">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[300px] [mask-image:linear-gradient(180deg,#000_0%,#000_52%,transparent_100%)]"
        style={{ background: 'var(--home-wash)' }}
      />
      <svg
        aria-hidden
        className="pointer-events-none absolute top-0 left-0"
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
      {days === 0 && (
        <ConfettiBackground className="pointer-events-none absolute inset-x-0 top-0 h-[300px]" count={30} />
      )}

      {/*
        The lead: title and countdown, centered in a band of their own rather
        than sitting right under the status bar now that nothing else is above
        them. `min-h` plus `items-center` is what centers them - the padding is
        symmetric so the middle of the band is the middle of the content, and
        the safe-area inset is added to both the height and the top padding so
        a notch eats into the band instead of into the text.
      */}
      <div className="relative flex min-h-[calc(160px+env(safe-area-inset-top))] items-center gap-5 px-1.5 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-6">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {typeKey && (
            <span className="text-primary text-[13px] font-semibold">
              {t(`typeLabel.${typeKey}`)}
            </span>
          )}
          <h2 className="line-clamp-3 text-[27px] leading-[1.18] font-extrabold tracking-[-0.015em] text-balance">
            {event.title}
          </h2>
        </div>
        {days !== null && days >= 0 && (
          <div className="flex shrink-0 flex-col items-center gap-0.5">
            <span
              dir="ltr"
              className={cn(
                'from-primary to-home-violet bg-gradient-to-br bg-clip-text leading-[0.85] font-extrabold tracking-[-0.05em] text-transparent tabular-nums',
                days === 0 ? 'text-[44px] tracking-[-0.03em]' : 'text-[64px]',
              )}
            >
              {days === 0 ? t('hero.todayTitle') : days}
            </span>
            <span className="text-muted-foreground text-[12.5px] font-bold">
              {days === 0 ? t('hero.todaySub') : t('hero.daysLabel', { count: days })}
            </span>
            <span className="bg-primary/40 mt-1 h-0.5 w-8 rounded-full" />
          </div>
        )}
      </div>

      <div className="bg-card border-border relative mt-4 flex flex-col gap-2.5 rounded-3xl border p-4 shadow-[0_18px_44px_rgba(26,11,46,0.1)] dark:shadow-[0_18px_44px_rgba(0,0,0,0.35)]">
        {dateText ? (
          <HeroRow
            icon={<IconCalendar className="size-[17px]" />}
            iconClassName="bg-primary/15 text-primary"
          >
            <span className="text-muted-foreground text-[11.5px]">{t('hero.dateLabel')}</span>
            <span className="text-[15px] font-semibold">{dateText}</span>
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
