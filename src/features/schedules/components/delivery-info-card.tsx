import { getTranslations } from 'next-intl/server';
import { IconMessage } from '@tabler/icons-react';

import { CheckList } from './check-list';

const POINTS = ['official', 'fallback', 'results'] as const;

/**
 * How a WhatsApp message gets to the guest, said once at the top of a Schedule
 * that has not gone out yet.
 *
 * A neutral card, not a notice: nothing here needs the organiser's attention,
 * it answers the question they have before they trust the send - what happens
 * when WhatsApp cannot deliver, and where they will see the outcome. Once the
 * Schedule has been sent the results tab answers it with real numbers, so the
 * card leaves.
 */
export async function DeliveryInfoCard() {
  const t = await getTranslations('schedules.deliveryInfo');

  return (
    <section className="bg-muted/60 flex items-start gap-[11px] rounded-[14px] border px-3.5 py-[13px]">
      <span
        aria-hidden
        className="bg-success/10 text-success flex size-8 shrink-0 items-center justify-center rounded-[10px]"
      >
        <IconMessage size={17} stroke={1.9} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h3 className="text-sm font-extrabold">{t('title')}</h3>
        <CheckList
          items={POINTS.map((point) => t(`points.${point}`))}
          textClassName="text-[12.5px] leading-normal"
        />
      </div>
    </section>
  );
}
