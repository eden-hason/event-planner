'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  IconChevronRight,
  IconDeviceMobilePlus,
  IconX,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { useInstallability } from '../hooks/use-installability';
import type { DismissVia } from '../types';

/** Matches the collapse transition below. */
const COLLAPSE_MS = 200;

/**
 * The Install Card on Home: an offer to add Kululu to the phone's home screen.
 * Not a Featured Action - it sits above "What's next", takes none of its slots,
 * and unlike them can be dismissed, because being installed is a fact about the
 * device (see `CONTEXT.md`).
 *
 * "Add" never dismisses: on Android it opens the browser's install dialog, on
 * iOS the instructions drawer. Only ✕ and the drawer's "Done" do.
 */
export function InstallCard() {
  const t = useTranslations('installApp.card');
  const [closing, setClosing] = useState(false);
  // "Done" collapses the card too, once the drawer is out of the way.
  const { visible, open, dismiss, drawer } = useInstallability('home', {
    onDone: () => close('done'),
  });

  if (!visible) return null;

  // Collapses first, then records the dismissal, which unmounts the card.
  const close = (via: DismissVia) => {
    setClosing(true);
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    window.setTimeout(() => dismiss(via), reduced ? 0 : COLLAPSE_MS);
  };

  return (
    <>
      {/* Its own bottom padding is the space to the list below, so a collapsed
        card leaves none behind; the list leaves it no gap of its own. */}
      <div
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none',
          // Enters from zero height once the browser has decided it can show,
          // so the list below slides down rather than jumping.
          'starting:grid-rows-[0fr] starting:opacity-0',
          closing ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100',
        )}
      >
        {/* Clips the collapse, but reaches past the card so the ✕ that sits on
          its corner is not cut off - by the page's 16px gutter, no further, or
          the phone would scroll sideways. */}
        <div className="-mx-4 min-h-0 overflow-hidden px-4">
          <div className="pt-[22px] pb-3.5">
            <div className="bg-card border-border hover:border-primary/40 hover:bg-primary/[0.03] relative rounded-2xl border transition-colors">
              <button
                type="button"
                // On Android the card leaves as the browser's own dialog opens over
                // it; a cancel brings it back on a later visit, an install never does.
                onClick={() => void open()}
                className="focus-visible:ring-primary flex w-full items-center gap-3 rounded-2xl p-3.5 text-start outline-none focus-visible:ring-2 focus-visible:ring-inset"
              >
                <span className="bg-primary/15 text-primary flex size-[42px] shrink-0 items-center justify-center rounded-xl">
                  <IconDeviceMobilePlus
                    className="size-[21px]"
                    strokeWidth={1.9}
                  />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[15px] leading-[1.35] font-bold text-pretty">
                    {t('label')}
                  </span>
                  <span className="text-muted-foreground text-[13px] leading-[1.45] text-pretty">
                    {t('text')}
                  </span>
                </span>
                <span className="bg-primary/15 text-primary me-2 flex h-[34px] shrink-0 items-center gap-[3px] rounded-full px-3 text-[13.5px] font-bold whitespace-nowrap">
                  {t('add')}
                  <IconChevronRight
                    className="size-4 rtl:rotate-180"
                    strokeWidth={2.2}
                  />
                </span>
              </button>

              {/* A 44px target centred on the card's corner, around a small circle. */}
              <button
                type="button"
                onClick={() => close('x')}
                aria-label={t('hide')}
                className="text-muted-foreground focus-visible:ring-primary absolute -end-[22px] -top-[22px] flex size-11 items-center justify-center rounded-full outline-none focus-visible:ring-2"
              >
                <span className="bg-card border-border flex size-5 items-center justify-center rounded-full border shadow-[0_2px_6px_rgba(26,11,46,0.12)]">
                  <IconX className="size-2.5" strokeWidth={2.2} />
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {drawer}
    </>
  );
}
