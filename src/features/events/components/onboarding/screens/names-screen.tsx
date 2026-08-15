'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  TakeoverButton,
  TakeoverError,
  TakeoverHeading,
  TakeoverInput,
} from '../takeover-shell';
import { isCoupleEvent, type EventTypeKey } from '../../../schemas';
import type { EventHostNames } from '../../../utils/event-title';

/**
 * Where the card comes alive, because the names are what make it theirs.
 *
 * Branches on type: wedding and henna ask for two names, the mitzvas for one,
 * and the copy never says "couple" on the single-name path. A bat mitzva takes
 * the feminine copy, which matters in Hebrew where "who's celebrating" and
 * "name of the celebrant" are both gendered. The event title is generated from
 * these server-side and is never shown as an editable field.
 */
export function NamesScreen({
  eventType,
  initial,
  onSubmit,
  onChange,
}: {
  eventType: EventTypeKey;
  initial: EventHostNames;
  onSubmit: (names: EventHostNames) => void;
  /** Fires as they type, so the card fills in live. */
  onChange: (names: EventHostNames) => void;
}) {
  const t = useTranslations('onboarding.names');
  const couple = isCoupleEvent(eventType);
  const female = eventType === 'bat_mitzva';

  const singleTitle = female ? t('titleSingleFemale') : t('titleSingleMale');
  const celebrantLabel = female
    ? t('celebrantLabelFemale')
    : t('celebrantLabelMale');

  const [first, setFirst] = useState(
    couple ? (initial.brideName ?? '') : (initial.childName ?? ''),
  );
  const [second, setSecond] = useState(initial.groomName ?? '');
  const [showError, setShowError] = useState(false);

  const toNames = (a: string, b: string): EventHostNames =>
    couple ? { brideName: a, groomName: b } : { childName: a };

  const update = (a: string, b: string) => {
    setShowError(false);
    onChange(toNames(a, b));
  };

  const missingFirst = !first.trim();
  const missingSecond = couple && !second.trim();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (missingFirst || missingSecond) {
      setShowError(true);
      return;
    }
    onSubmit(toNames(first, second));
  };

  return (
    <form onSubmit={handleSubmit} className="contents">
      <TakeoverHeading
        title={couple ? t('titleCouple') : singleTitle}
        subtitle={t('subtitle')}
      />
      <div className="flex flex-col gap-3">
        <TakeoverInput
          value={first}
          onChange={(e) => {
            setFirst(e.target.value);
            update(e.target.value, second);
          }}
          placeholder={couple ? t('brideLabel') : celebrantLabel}
          invalid={showError && missingFirst}
          autoComplete="off"
          aria-label={couple ? t('brideLabel') : celebrantLabel}
        />
        {couple && (
          <TakeoverInput
            value={second}
            onChange={(e) => {
              setSecond(e.target.value);
              update(first, e.target.value);
            }}
            placeholder={t('groomLabel')}
            invalid={showError && missingSecond}
            autoComplete="off"
            aria-label={t('groomLabel')}
          />
        )}
        {showError && <TakeoverError>{t('error')}</TakeoverError>}
        <TakeoverButton type="submit" className="mt-1.5">
          {t('continue')}
        </TakeoverButton>
      </div>
    </form>
  );
}
