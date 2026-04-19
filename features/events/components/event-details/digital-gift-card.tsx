'use client';

import { useFormContext } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cardHover } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { EventDetailsUpdate } from '../../schemas';

export function DigitalGiftCard() {
  const t = useTranslations('eventDetails.digitalGift');
  const form = useFormContext<EventDetailsUpdate>();
  const payboxEnabled = form.watch('eventSettings.payboxConfig.enabled');
  const bitEnabled = form.watch('eventSettings.bitConfig.enabled');

  return (
    <Card className={cardHover}>
      <CardHeader>
        <CardTitle className="text-xl font-bold">{t('title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <FormField
              control={form.control}
              name="eventSettings.payboxConfig.enabled"
              render={({ field }) => (
                <FormItem className="flex w-full flex-row items-center justify-between">
                  <FormLabel>{t('payboxLabel')}</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="eventSettings.payboxConfig.link"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    type="url"
                    placeholder={t('payboxPlaceholder')}
                    disabled={!payboxEnabled}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <p className="text-muted-foreground text-sm">{t('payboxHelper')}</p>
        </div>

        <Separator className="my-4" />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <FormField
              control={form.control}
              name="eventSettings.bitConfig.enabled"
              render={({ field }) => (
                <FormItem className="flex w-full flex-row items-center justify-between">
                  <FormLabel>{t('bitLabel')}</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="eventSettings.bitConfig.phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    type="tel"
                    placeholder={t('bitPlaceholder')}
                    disabled={!bitEnabled}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <p className="text-muted-foreground text-sm">{t('bitHelper')}</p>
        </div>
      </CardContent>
    </Card>
  );
}
