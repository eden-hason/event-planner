'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { LocationInput } from '@/components/ui/location-input';
import { cn } from '@/lib/utils';
import {
  TAKEOVER_FIELD,
  TakeoverButton,
  TakeoverHeading,
  TakeoverSkipButton,
} from '../takeover-shell';
import type { Location } from '../../../schemas';

/**
 * The venue, via the existing Google Places input. Optional.
 *
 * "We'll send your guests directions" is the first hint of what Kululu actually
 * does for them, so it carries weight rather than sitting as fine print.
 * Picking a place commits and advances; there is no separate continue button,
 * because choosing from the list is itself the answer.
 */
export function VenueScreen({
  initial,
  onPick,
  onSkip,
  onChange,
}: {
  initial?: Location;
  onPick: (location: Location) => void;
  onSkip: () => void;
  onChange: (location: Location | undefined) => void;
}) {
  const t = useTranslations('onboarding.venue');
  const [value, setValue] = useState(initial?.name ?? '');
  // Held alongside the text so the button can commit what was typed, including
  // free text that never matched a Places suggestion and so carries no coords.
  const [location, setLocation] = useState<Location | undefined>(initial);

  return (
    <>
      <TakeoverHeading
        title={t('title')}
        subtitle={
          <span className="flex items-center gap-1.5">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--kt-brand)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
              aria-hidden="true"
            >
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {t('subtitle')}
          </span>
        }
      />
      <div className="flex flex-col gap-3">
        <LocationInput
          value={value}
          placeholder={t('placeholder')}
          // The Places input is an app design-system component, so left alone it
          // renders 36px tall with a small radius next to 54px takeover fields.
          // The `!` overrides are the component's own important defaults; the
          // `[&_input]` rules reach the inner control, which carries the app's
          // height and type scale.
          inputClassName={cn(
            TAKEOVER_FIELD,
            '!border-[var(--kt-border)] !bg-white shadow-none',
            '[&_input]:h-full [&_input]:text-[17px] [&_input]:font-medium [&_input]:text-[var(--kt-ink)] [&_input]:placeholder:text-[var(--kt-ink-ghost)]',
            'has-[[data-slot=input-group-control]:focus-visible]:!border-[var(--kt-brand)]',
            'has-[[data-slot=input-group-control]:focus-visible]:shadow-[0_0_0_3px_rgba(210,60,194,0.18)]',
          )}
          onChange={(name, _placeId, coords) => {
            setValue(name);
            const next = name ? { name, coords } : undefined;
            setLocation(next);
            onChange(next);
            // Coordinates only arrive when a suggestion is chosen, as opposed
            // to free text still being typed - that is the commit signal.
            if (next && coords) onPick(next);
          }}
        />
        <TakeoverButton
          disabled={!value.trim()}
          onClick={() => location && onPick(location)}
          className="mt-1.5"
        >
          {t('continue')}
        </TakeoverButton>
        <TakeoverSkipButton onClick={onSkip}>{t('skip')}</TakeoverSkipButton>
      </div>
    </>
  );
}
