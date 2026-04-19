'use client';

import { useFormContext } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cardHover } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { EventDetailsUpdate } from '../../schemas';

export function CoupleCard() {
  const t = useTranslations('eventDetails.couple');
  const form = useFormContext<EventDetailsUpdate>();

  return (
    <Card className={cardHover}>
      <CardHeader>
        <CardTitle className="text-xl font-bold">{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h4 className="text-muted-foreground text-sm font-medium">
            {t('coupleNames')}
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="hostDetails.bride.name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('brideName')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('brideNamePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="hostDetails.groom.name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('groomName')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('groomNamePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h4 className="text-muted-foreground text-sm font-medium">
            {t('parentsNames')}
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="hostDetails.bride.parents"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('brideSide')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('brideSidePlaceholder')}
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="hostDetails.groom.parents"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('groomSide')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('groomSidePlaceholder')}
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
