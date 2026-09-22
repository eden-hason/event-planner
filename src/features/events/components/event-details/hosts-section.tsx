'use client';

import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { EventDetailsFormValues } from '../../schemas';
import { SECTION_IDS, useEventDetails } from './event-details-context';
import { HostsEditorDrawer } from './hosts-editor-drawer';

const TITLE_ID = `${SECTION_IDS.hosts}-title`;

function PersonSummary({
  initial,
  role,
  name,
  parents,
  placeholder,
  accent,
  stacked,
}: {
  initial: string;
  role: string;
  name: string;
  parents: string;
  placeholder: string;
  /** Bride and groom are told apart by the colour of their initial. */
  accent: 'primary' | 'violet';
  /**
   * One of a couple on a phone: avatar above the name so two people fit side by
   * side. From `lg` the hero is a single row and each person lies flat again.
   */
  stacked: boolean;
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-3',
        stacked
          ? 'flex-1 flex-col gap-1.5 text-center lg:flex-none lg:flex-row lg:gap-3 lg:text-start'
          : 'flex-1',
      )}
    >
      <div
        aria-hidden
        className={cn(
          'bg-background border-primary/15 flex shrink-0 items-center justify-center rounded-full border font-extrabold',
          stacked ? 'size-13 text-lg lg:size-[54px] lg:text-xl' : 'size-15 text-[22px] lg:size-[54px] lg:text-xl',
          accent === 'violet' ? 'text-home-violet' : 'text-primary',
        )}
      >
        {initial}
      </div>
      <div className="flex min-w-0 max-w-full flex-col gap-0.5">
        <p
          className={cn(
            'truncate leading-tight font-extrabold',
            stacked ? 'text-[15.5px] lg:text-[17px]' : 'text-[19px] lg:text-[17px]',
            !name && 'text-muted-foreground font-medium',
          )}
        >
          {name || placeholder}
        </p>
        <p className="text-muted-foreground truncate text-[11.5px] leading-snug lg:text-xs">
          {parents || role}
        </p>
      </div>
    </div>
  );
}

/**
 * The people the Event is named after, as the hero of the page, with one way in
 * to change them.
 *
 * The names are the most settled thing on this page - typed once during
 * onboarding and rarely touched again - so they read as a statement on the
 * Home wash rather than four inputs the Owner has to scroll past every visit,
 * and open a focused editor when they do need a correction. On desktop the hero
 * spans both columns and carries the moment of the Event beside the names.
 */
export function HostsSection() {
  const t = useTranslations('eventDetails.hosts');
  const tWhen = useTranslations('eventDetails.when');
  const locale = useLocale();
  const { couple, female, hasCeremony } = useEventDetails();
  const form = useFormContext<EventDetailsFormValues>();
  const [editing, setEditing] = useState(false);

  const hosts = form.watch('hostDetails');
  const eventDate = form.watch('eventDate');
  const receptionTime = form.watch('receptionTime');
  const ceremonyTime = form.watch('ceremonyTime');

  const title = couple
    ? t('titleCouple')
    : female
      ? t('titleSingleFemale')
      : t('titleSingleMale');

  const editLabel = couple
    ? t('editCouple')
    : female
      ? t('editSingleFemale')
      : t('editSingleMale');

  const initial = (value: string, fallback: string) =>
    value.trim()[0]?.toUpperCase() || fallback;

  const dateText = eventDate
    ? new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-GB', {
      dateStyle: 'full',
      timeZone: 'UTC',
    }).format(new Date(eventDate))
    : null;

  const timeParts = [
    receptionTime && `${tWhen('receptionTimeShort')} ${receptionTime}`,
    hasCeremony && ceremonyTime && `${tWhen('ceremonyTimeShort')} ${ceremonyTime}`,
  ].filter(Boolean) as string[];

  return (
    <section
      id={SECTION_IDS.hosts}
      aria-labelledby={TITLE_ID}
      className="border-primary/10 flex scroll-mt-20 flex-col gap-3.5 rounded-2xl border px-3.5 py-4 [background:var(--home-wash)] lg:flex-row lg:items-center lg:gap-6 lg:px-5.5 lg:py-5"
    >
      {/* The row of names says who they are on desktop; the phone needs the word. */}
      <h2 id={TITLE_ID} className="text-primary text-xs font-bold lg:sr-only">
        {title}
      </h2>

      {couple ? (
        <div className="flex min-w-0 items-start gap-2 lg:flex-1 lg:items-center lg:gap-5">
          <PersonSummary
            initial={initial(hosts.bride.name, '♀')}
            role={t('bride')}
            name={hosts.bride.name}
            parents={hosts.bride.parents}
            placeholder={t('noNames')}
            accent="primary"
            stacked
          />
          <span
            aria-hidden
            className="text-primary/45 pt-4 text-xl font-bold lg:pt-0 lg:text-[22px]"
          >
            &amp;
          </span>
          <PersonSummary
            initial={initial(hosts.groom.name, '♂')}
            role={t('groom')}
            name={hosts.groom.name}
            parents={hosts.groom.parents}
            placeholder={t('noNames')}
            accent="violet"
            stacked
          />
        </div>
      ) : (
        <div className="flex min-w-0 lg:flex-1">
          <PersonSummary
            initial={initial(hosts.child.name, female ? '♀' : '♂')}
            role={female ? t('celebrantFemale') : t('celebrantMale')}
            name={hosts.child.name}
            parents={hosts.child.parents}
            placeholder={t('noNames')}
            accent="primary"
            stacked={false}
          />
        </div>
      )}

      {/*
        The moment of the Event, restated beside the people it belongs to.
        Desktop only: the phone has the `when` section a thumb-flick away, and
        repeating the date there costs a third of the first screen.
      */}
      {dateText && (
        <>
          <div aria-hidden className="bg-primary/20 hidden h-12 w-px shrink-0 lg:block" />
          <div className="hidden shrink-0 flex-col gap-0.5 lg:flex">
            <span className="text-primary text-[11.5px] font-bold">
              {t('momentLabel')}
            </span>
            <span className="text-base font-extrabold">{dateText}</span>
            {timeParts.length > 0 && (
              <span className="text-muted-foreground text-[12.5px]">
                {timeParts.join(' · ')}
              </span>
            )}
          </div>
        </>
      )}

      <Button
        type="button"
        variant="outline"
        className="border-primary/25 bg-background/70 text-primary hover:bg-background hover:text-primary h-9 w-full shrink-0 rounded-[11px] font-bold lg:w-auto lg:px-4"
        onClick={() => setEditing(true)}
      >
        {editLabel}
      </Button>

      <HostsEditorDrawer open={editing} onOpenChange={setEditing} />
    </section>
  );
}
