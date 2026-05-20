'use client';

import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useActionState, startTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { z } from 'zod';
import { Check, Gift, Info } from 'lucide-react';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ToggleCard } from '@/components/ui/toggle-card';
import {
  EventApp,
  EventDetailsUpdateSchema,
  UpdateEventDetailsState,
} from '../../schemas';
import { updateEventDetails } from '../../actions';

const DigitalGiftCardSchema = EventDetailsUpdateSchema.pick({ id: true, eventSettings: true });
type DigitalGiftCardValues = z.infer<typeof DigitalGiftCardSchema>;

const PAYBOX_REGEX = /^https?:\/\//;
const BIT_REGEX = /^\+?[\d\s\-]{7,}$/;

function PayboxIcon() {
  return <Image src="/gift-paybox-logo.svg" alt="PayBox" width={28} height={28} className="rounded-sm" />;
}

function BitIcon() {
  return <Image src="/gift-bit-logo.svg" alt="Bit" width={28} height={28} />;
}

interface DigitalGiftCardProps {
  event: EventApp;
}

export function DigitalGiftCard({ event }: DigitalGiftCardProps) {
  const t = useTranslations('eventDetails.digitalGift');
  const tHeader = useTranslations('eventDetails.header');

  const form = useForm<DigitalGiftCardValues>({
    resolver: zodResolver(DigitalGiftCardSchema),
    defaultValues: {
      id: event.id,
      eventSettings: {
        payboxConfig: {
          enabled: event.eventSettings?.payboxConfig?.enabled || false,
          link: event.eventSettings?.payboxConfig?.link || '',
        },
        bitConfig: {
          enabled: event.eventSettings?.bitConfig?.enabled || false,
          phoneNumber: event.eventSettings?.bitConfig?.phoneNumber || '',
        },
      },
    },
  });

  const isDirty = form.formState.isDirty;

  const payboxLink = form.watch('eventSettings.payboxConfig.link');
  const bitPhone = form.watch('eventSettings.bitConfig.phoneNumber');

  const isPayboxValid = !!payboxLink && PAYBOX_REGEX.test(payboxLink);
  const isBitValid = !!bitPhone && BIT_REGEX.test(bitPhone);

  const [, formAction, isPending] = useActionState(
    async (_prev: UpdateEventDetailsState | null, formData: FormData) => {
      try {
        const result = await updateEventDetails(formData);
        if (result.success) {
          toast.success(result.message);
          form.reset(form.getValues());
        } else {
          toast.error(result.message);
        }
        return result;
      } catch {
        toast.error('Something went wrong');
        return null;
      }
    },
    null,
  );

  const onSubmit = (values: DigitalGiftCardValues) => {
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object') formData.append(key, JSON.stringify(value));
        else formData.append(key, String(value));
      }
    });
    startTransition(() => formAction(formData));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Gift className="size-4 shrink-0 text-primary" />
              <CardTitle className="text-xl font-bold">{t('title')}</CardTitle>
            </div>
            {isDirty && (
              <CardAction className="animate-in fade-in-0 zoom-in-95 duration-200">
                <Button type="submit" size="sm" disabled={isPending}>
                  <IconDeviceFloppy className="size-4" />
                  {isPending ? tHeader('saving') : tHeader('save')}
                </Button>
              </CardAction>
            )}
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
      </form>
    </Form>
  );
}
