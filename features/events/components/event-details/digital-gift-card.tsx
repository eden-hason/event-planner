'use client';

import Image from 'next/image';
import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { Check, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ToggleCard } from '@/components/ui/toggle-card';
import { EventDetailsUpdate } from '../../schemas';

const PAYBOX_REGEX = /^https?:\/\//;
const BIT_REGEX = /^\+?[\d\s\-]{7,}$/;

function PayboxIcon() {
  return <Image src="/gift-paybox-logo.svg" alt="PayBox" width={28} height={28} className="rounded-sm" />;
}

function BitIcon() {
  return <Image src="/gift-bit-logo.svg" alt="Bit" width={28} height={28} />;
}

export function DigitalGiftCard() {
  const t = useTranslations('eventDetails.digitalGift');
  const form = useFormContext<EventDetailsUpdate>();

  const payboxLink = useWatch({ control: form.control, name: 'eventSettings.payboxConfig.link' });
  const bitPhone = useWatch({ control: form.control, name: 'eventSettings.bitConfig.phoneNumber' });

  const isPayboxValid = !!payboxLink && PAYBOX_REGEX.test(payboxLink);
  const isBitValid = !!bitPhone && BIT_REGEX.test(bitPhone);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-bold">{t('title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <FormField
            control={form.control}
            name="eventSettings.payboxConfig.enabled"
            render={({ field }) => (
              <ToggleCard
                icon={<PayboxIcon />}
                title="PayBox"
                subtitle={t('payboxSubtitle')}
                value={field.value ?? false}
                onChange={field.onChange}
              >
                <FormField
                  control={form.control}
                  name="eventSettings.payboxConfig.link"
                  render={({ field: linkField }) => (
                    <FormItem>
                      <FormLabel>{t('payboxLabel')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="url"
                            dir="ltr"
                            placeholder={t('payboxPlaceholder')}
                            className={isPayboxValid ? 'pr-9 border-emerald-500' : ''}
                            {...linkField}
                          />
                          {isPayboxValid && (
                            <Check className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="mt-2.5 flex gap-2.5 rounded-md bg-[color-mix(in_oklch,var(--primary)_5%,var(--muted))] px-3 py-2.5 text-xs leading-relaxed text-secondary-foreground">
                  <Info className="mt-px h-4 w-4 shrink-0 text-primary" />
                  {t('payboxHelper')}
                </div>
              </ToggleCard>
            )}
          />

          <FormField
            control={form.control}
            name="eventSettings.bitConfig.enabled"
            render={({ field }) => (
              <ToggleCard
                icon={<BitIcon />}
                title="Bit"
                subtitle={t('bitSubtitle')}
                value={field.value ?? false}
                onChange={field.onChange}
              >
                <FormField
                  control={form.control}
                  name="eventSettings.bitConfig.phoneNumber"
                  render={({ field: phoneField }) => (
                    <FormItem>
                      <FormLabel>{t('bitLabel')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="tel"
                            dir="ltr"
                            placeholder={t('bitPlaceholder')}
                            className={isBitValid ? 'pr-9 border-emerald-500' : ''}
                            {...phoneField}
                          />
                          {isBitValid && (
                            <Check className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="mt-2.5 flex gap-2.5 rounded-md bg-[color-mix(in_oklch,var(--primary)_5%,var(--muted))] px-3 py-2.5 text-xs leading-relaxed text-secondary-foreground">
                  <Info className="mt-px h-4 w-4 shrink-0 text-primary" />
                  {t('bitHelper')}
                </div>
              </ToggleCard>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
