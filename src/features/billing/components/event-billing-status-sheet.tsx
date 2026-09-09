'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { IconBrandWhatsapp } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { billingWhatsAppUrl } from '../utils';
import type { BillingHeaderStatus } from '../types';

type EventBillingStatusSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: BillingHeaderStatus;
};

/**
 * The detail behind the header pill: what the current billing status means,
 * what planning covers, and what sending unlocks. Checkout is external, so the
 * call to action is a WhatsApp conversation rather than a payment button.
 */
export function EventBillingStatusSheet({
  open,
  onOpenChange,
  status,
}: EventBillingStatusSheetProps) {
  const t = useTranslations('billing');
  const locale = useLocale();
  const dir = locale === 'he' ? 'rtl' : 'ltr';

  const includedKeys = ['guests', 'budget', 'collaborate', 'seating'] as const;
  const unlockKeys = ['whatsapp', 'calls', 'tracking'] as const;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent dir={dir} className="mx-auto max-w-md">
        <DrawerHeader className="text-start">
          <DrawerTitle>{t(`sheet.${status.status}.title`)}</DrawerTitle>
          <DrawerDescription>
            {t(`sheet.${status.status}.description`)}
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-5 px-4 pb-2 text-start">
          {!status.sendingEnabled && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">
                {t('sheet.includedTitle')}
              </h3>
              <ul className="space-y-1.5">
                {includedKeys.map((key) => (
                  <li
                    key={key}
                    className="text-muted-foreground flex items-start gap-2 text-sm"
                  >
                    <Check
                      className="mt-0.5 size-4 shrink-0 text-emerald-600"
                      aria-hidden
                    />
                    <span>{t(`sheet.included.${key}`)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">
              {status.sendingEnabled
                ? t('sheet.activeTitle')
                : t('sheet.unlocksTitle')}
            </h3>
            <ul className="space-y-1.5">
              {unlockKeys.map((key) => (
                <li
                  key={key}
                  className="text-muted-foreground flex items-start gap-2 text-sm"
                >
                  <Check
                    className={cn(
                      'mt-0.5 size-4 shrink-0',
                      status.sendingEnabled
                        ? 'text-emerald-600'
                        : 'text-muted-foreground/50',
                    )}
                    aria-hidden
                  />
                  <span>{t(`sheet.unlocks.${key}`)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <DrawerFooter>
          <Button
            asChild
            variant={status.sendingEnabled ? 'outline' : 'default'}
          >
            <a
              href={billingWhatsAppUrl(t('sheet.whatsAppMessage'))}
              target="_blank"
              rel="noopener noreferrer"
            >
              <IconBrandWhatsapp className="size-4" />
              {t('sheet.cta.talk')}
            </a>
          </Button>
          <DrawerClose asChild>
            <Button variant="ghost">{t('sheet.close')}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
