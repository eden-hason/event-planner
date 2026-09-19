'use client';

import { useCallback, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useFeatureHeader } from '@/components/feature-layout';
import type { EventApp } from '@/features/events/schemas';
import { updateGiftingSettings } from '../actions';
import { giftProviderStatus } from '../utils';
import type { GiftProviderConfig } from '../types';
import { GiftingHero } from './gifting-hero';
import { PayboxCard } from './paybox-card';
import { BitCard } from './bit-card';
import { PrivacyNote } from './privacy-note';
import { GiftButtonsCard } from './gift-buttons-card';

type Provider = 'paybox' | 'bit';

function readConfig(raw: { enabled?: boolean; link?: string } | undefined): GiftProviderConfig {
  return { enabled: raw?.enabled ?? false, link: raw?.link ?? '' };
}

export function GiftingPage({ event }: { event: EventApp }) {
  const t = useTranslations('gifting');
  const tToast = useTranslations('gifting.toast');
  const locale = useLocale();

  useFeatureHeader({ title: t('title') });

  const [paybox, setPaybox] = useState(() =>
    readConfig(event.eventSettings?.payboxConfig),
  );
  const [bit, setBit] = useState(() => readConfig(event.eventSettings?.bitConfig));
  const [pending, setPending] = useState<Provider | null>(null);
  const [giftButtons, setGiftButtons] = useState<Partial<Record<string, boolean>>>(
    () => event.eventSettings?.giftButtons ?? {},
  );
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  /**
   * Persist one provider. Both blocks are always sent so the row keeps a
   * consistent view even though the action also merges server-side. `mode`
   * only picks the toast copy.
   */
  const save = useCallback(
    async (
      provider: Provider,
      next: GiftProviderConfig,
      mode: 'save' | 'disconnect',
    ): Promise<boolean> => {
      const nextPaybox = provider === 'paybox' ? next : paybox;
      const nextBit = provider === 'bit' ? next : bit;

      const formData = new FormData();
      formData.set('eventId', event.id);
      formData.set('payboxConfig', JSON.stringify(nextPaybox));
      formData.set('bitConfig', JSON.stringify(nextBit));

      setPending(provider);
      const promise = updateGiftingSettings(formData).then((result) => {
        if (!result.success) {
          throw new Error(result.message || tToast('error'));
        }
        return result;
      });

      toast.promise(promise, {
        loading: tToast('saving'),
        success: () =>
          mode === 'disconnect' ? tToast('disconnected') : tToast('saved'),
        error: (err) => (err instanceof Error ? err.message : tToast('error')),
      });

      try {
        await promise;
        if (provider === 'paybox') setPaybox(nextPaybox);
        else setBit(nextBit);
        return true;
      } catch {
        return false;
      } finally {
        setPending(null);
      }
    },
    [event.id, paybox, bit, tToast],
  );

  /**
   * Persist one message's gift button choice. Only that key is sent; the
   * action merges it over the others. The switch flips once the save lands,
   * so it never shows a choice the send path will not honour.
   */
  const toggleGiftButton = useCallback(
    async (scheduleTypeKey: string, on: boolean) => {
      const formData = new FormData();
      formData.set('eventId', event.id);
      formData.set('giftButtons', JSON.stringify({ [scheduleTypeKey]: on }));

      setPendingMessage(scheduleTypeKey);
      const promise = updateGiftingSettings(formData).then((result) => {
        if (!result.success) {
          throw new Error(result.message || tToast('error'));
        }
        return result;
      });

      toast.promise(promise, {
        loading: tToast('saving'),
        success: () => tToast('saved'),
        error: (err) => (err instanceof Error ? err.message : tToast('error')),
      });

      try {
        await promise;
        setGiftButtons((prev) => ({ ...prev, [scheduleTypeKey]: on }));
      } catch {
        // The toast already reported it; the switch stays where it was.
      } finally {
        setPendingMessage(null);
      }
    },
    [event.id, tToast],
  );

  const connectedCount =
    (giftProviderStatus('paybox', paybox) === 'connected' ? 1 : 0) +
    (giftProviderStatus('bit', bit) === 'connected' ? 1 : 0);

  return (
    <div
      className="mx-auto flex max-w-4xl flex-col gap-8 pb-16"
      dir={locale === 'he' ? 'rtl' : 'ltr'}
    >
      <GiftingHero connectedCount={connectedCount} />

      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h3 className="text-2xl font-semibold tracking-tight">
            {t('connect.heading')}
          </h3>
          <p className="text-sm text-muted-foreground">{t('connect.subtitle')}</p>
        </div>

        {/* `[&>*]:min-w-0` so a long saved link inside a card can't blow the
            grid track wider than the viewport on mobile. */}
        <div className="grid grid-cols-1 gap-5 [&>*]:min-w-0 lg:grid-cols-2">
          <PayboxCard
            config={paybox}
            pending={pending === 'paybox'}
            onSave={(cfg) => save('paybox', cfg, 'save')}
            onDisconnect={() =>
              save('paybox', { enabled: false, link: '' }, 'disconnect')
            }
          />
          <BitCard
            config={bit}
            pending={pending === 'bit'}
            onSave={(cfg) => save('bit', cfg, 'save')}
            onDisconnect={() =>
              save('bit', { enabled: false, link: '' }, 'disconnect')
            }
          />
        </div>

        {connectedCount > 0 && (
          <GiftButtonsCard
            giftButtons={giftButtons}
            pending={pendingMessage}
            onToggle={toggleGiftButton}
          />
        )}

        <PrivacyNote />
      </section>
    </div>
  );
}
