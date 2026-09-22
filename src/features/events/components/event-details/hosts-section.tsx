'use client';

import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslations, useLocale } from 'next-intl';
import { Ampersand, Pencil } from 'lucide-react';
import { CoupleCardIcon } from '@/components/icons/couple-card-icon';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { EventDetailsFormValues } from '../../schemas';
import { SECTION_IDS, useEventDetails } from './event-details-context';
import { SectionCard } from './section-card';
import { HostsEditorDrawer } from './hosts-editor-drawer';

function PersonSummary({
  initial,
  role,
  name,
  parents,
  placeholder,
}: {
  initial: string;
  role: string;
  name: string;
  parents: string;
  placeholder: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <div
        aria-hidden
        className="bg-primary/15 text-primary ring-primary/20 flex size-10 shrink-0 items-center justify-center rounded-full text-base font-bold ring-2"
      >
        {initial}
      </div>
      <div className="min-w-0">
        <p
          className={cn(
            'truncate text-sm font-bold',
            !name && 'text-muted-foreground font-medium',
          )}
        >
          {name || placeholder}
        </p>
        <p className="text-muted-foreground truncate text-xs">
          {parents || role}
        </p>
      </div>
    </div>
  );
}

/**
 * The people the Event is named after, read-only, with one way in to change
 * them.
 *
 * The names are the most settled thing on this page - typed once during
 * onboarding and rarely touched again - so they read as a statement here and
 * open a focused editor when they do need a correction, rather than sitting in
 * four inputs the Owner has to scroll past every visit.
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
    <SectionCard id={SECTION_IDS.hosts} icon={<CoupleCardIcon className="text-primary size-4 shrink-0" />} title={title}>
      <div className="flex flex-col gap-4">
        {couple ? (
          <div className="flex items-center gap-2">
            <PersonSummary
              initial={initial(hosts.bride.name, '♀')}
              role={t('bride')}
              name={hosts.bride.name}
              parents={hosts.bride.parents}
              placeholder={t('noNames')}
            />
            <div
              aria-hidden
              className="bg-card text-primary flex size-7 shrink-0 items-center justify-center rounded-full border"
            >
              <Ampersand className="size-3.5" />
            </div>
            <PersonSummary
              initial={initial(hosts.groom.name, '♂')}
              role={t('groom')}
              name={hosts.groom.name}
              parents={hosts.groom.parents}
              placeholder={t('noNames')}
            />
          </div>
        ) : (
          <PersonSummary
            initial={initial(hosts.child.name, female ? '♀' : '♂')}
            role={female ? t('celebrantFemale') : t('celebrantMale')}
            name={hosts.child.name}
            parents={hosts.child.parents}
            placeholder={t('noNames')}
          />
        )}

        {/*
          The moment of the Event, restated beside the people it belongs to.
          Desktop only: the phone has the `when` section a thumb-flick away, and
          repeating the date there costs a third of the first screen.
        */}
        {dateText && (
          <div className="bg-muted/50 hidden flex-col gap-0.5 rounded-lg px-3 py-2 lg:flex">
            <span className="text-muted-foreground text-xs font-semibold">
              {tWhen('dateLabel')}
            </span>
            <span className="text-sm font-semibold">{dateText}</span>
            {timeParts.length > 0 && (
              <span className="text-muted-foreground text-xs">
                {timeParts.join(' · ')}
              </span>
            )}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setEditing(true)}
        >
          <Pencil className="size-4" />
          {editLabel}
        </Button>
      </div>

      <HostsEditorDrawer open={editing} onOpenChange={setEditing} />
    </SectionCard>
  );
}
