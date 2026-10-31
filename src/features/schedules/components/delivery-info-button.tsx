'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  IconDeviceMobile,
  IconEye,
  IconInfoCircle,
  IconMessageCircle,
  type Icon,
} from '@tabler/icons-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';

type Tone = 'success' | 'warning' | 'violet' | 'info' | 'muted';

const TONE: Record<Tone, string> = {
  success: 'bg-success/10 text-success',
  warning: 'bg-warning-tint text-warning-ink',
  violet: 'bg-violet-tint text-violet-strong',
  info: 'bg-info-tint text-info-strong',
  muted: 'bg-muted text-muted-foreground',
};

/**
 * The three things that happen to a message, in the order they happen. Each
 * step's tone is its tile's and its tag's; the results step instead shows the
 * readings the Owner will meet in the results tab, in those readings' tones.
 */
const STEPS: {
  key: 'whatsapp' | 'sms' | 'results';
  icon: Icon;
  tone: Tone;
}[] = [
  { key: 'whatsapp', icon: IconMessageCircle, tone: 'success' },
  { key: 'sms', icon: IconDeviceMobile, tone: 'warning' },
  { key: 'results', icon: IconEye, tone: 'violet' },
];

const STATUSES = [
  { key: 'delivered', tone: 'muted' },
  { key: 'read', tone: 'info' },
  { key: 'sms', tone: 'warning' },
] as const;

/**
 * How a WhatsApp message gets to the guest, behind a small pill in the
 * timeline's header while a WhatsApp Schedule has not gone out yet. It opens
 * as a dialog, or a bottom drawer on a phone.
 *
 * A question the Owner can ask, not a notice: nothing here needs their
 * attention, it answers what they want to know before they trust the send -
 * what happens when WhatsApp cannot deliver, and where they will see the
 * outcome. Once every WhatsApp Schedule has been sent the results tabs answer
 * it with real numbers, so the pill leaves.
 *
 * Under an SMS Fallback Opt-out (CONTEXT.md) the SMS step and its reading are
 * simply not there, and WhatsApp loses the tag that implied a second channel.
 */
export function DeliveryInfoButton({ smsFallback = true }: { smsFallback?: boolean }) {
  const t = useTranslations('schedules.deliveryInfo');
  const steps = smsFallback ? STEPS : STEPS.filter((step) => step.key !== 'sms');
  const statuses = smsFallback ? STATUSES : STATUSES.filter((status) => status.key !== 'sms');
  const dir = useLocale() === 'he' ? 'rtl' : 'ltr';
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const Title = isMobile ? DrawerTitle : DialogTitle;
  const Description = isMobile ? DrawerDescription : DialogDescription;

  const body = (
    <div
      className={cn(
        'flex flex-col gap-5 text-start',
        isMobile && 'px-4 pt-3 pb-7',
      )}
    >
      <div className="flex flex-col gap-1">
        <Title className="text-[19px] font-extrabold">{t('title')}</Title>
        <Description className="text-muted-foreground text-[13.5px]">
          {t(smsFallback ? 'subtitle' : 'subtitleTwoSteps')}
        </Description>
      </div>

      <ol className="flex flex-col">
        {steps.map(({ key, icon: StepIcon, tone }, index) => (
          <li key={key} className="relative flex gap-3 not-last:pb-5">
            {/* The dashed join from this step's tile down to the next one's */}
            {index < steps.length - 1 && (
              <span
                aria-hidden
                className="border-border absolute start-5 top-12 bottom-1 border-s-[1.5px] border-dashed"
              />
            )}
            <span
              aria-hidden
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-xl',
                TONE[tone],
              )}
            >
              <StepIcon size={19} stroke={1.9} />
            </span>
            <div className="flex min-w-0 flex-col gap-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[15px] font-bold">
                  {t(`steps.${key}.title`)}
                </span>
                {key !== 'results' && smsFallback && (
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                      TONE[tone],
                    )}
                  >
                    {t(`steps.${key}.tag`)}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground text-[13.5px] leading-relaxed">
                {t(`steps.${key}.body`)}
              </p>
              {key === 'results' && (
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {statuses.map((status) => (
                    <span
                      key={status.key}
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[11.5px] font-semibold',
                        TONE[status.tone],
                      )}
                    >
                      {t(`steps.results.statuses.${status.key}`)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>

      <Button
        type="button"
        onClick={() => setOpen(false)}
        className="bg-foreground text-background hover:bg-foreground/90 w-full"
      >
        {t('done')}
      </Button>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          // A text link rather than a badge: it sits on the title's line in the
          // section header, so it is no taller than that line.
          'text-primary inline-flex h-5 shrink-0 cursor-pointer items-center gap-1 rounded-sm text-xs font-semibold underline-offset-4 hover:underline',
          'focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]',
          // A 44px target on a phone without a taller link.
          'relative after:absolute after:-inset-x-1 after:-inset-y-3',
        )}
      >
        <IconInfoCircle className="size-3.5" stroke={2} />
        {t('trigger')}
      </button>

      {isMobile ? (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent dir={dir} className="mx-auto max-w-md">
            {body}
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            dir={dir}
            className="sm:max-w-md"
            // Nothing here wants the keyboard first; without this the close X shows a focus ring.
            onOpenAutoFocus={(event) => event.preventDefault()}
          >
            {body}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
