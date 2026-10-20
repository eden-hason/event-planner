'use client';

import { useLocale, useTranslations } from 'next-intl';
import { IconInfoCircle } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

/**
 * How to add Kululu to the home screen on an iPhone or iPad, which has no
 * install API. Only the first step differs by browser: Safari keeps Share in
 * the bottom bar (or under ⋯ in iOS 26's compact layout), Chrome keeps it in
 * the address bar at the top.
 *
 * "Done" is the dismissal - Safari can never learn the app was installed, so
 * it is the only thing that turns the Install Card off. Swiping the drawer away
 * just closes it.
 */
export function InstallDrawer({
  open,
  onOpenChange,
  browser,
  onDone,
  onClosed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  browser: 'ios-safari' | 'ios-chrome';
  onDone: () => void;
  /** After the close animation, however the drawer was closed. */
  onClosed?: () => void;
}) {
  const t = useTranslations('installApp.drawer');
  const locale = useLocale();
  const dir = locale === 'he' ? 'rtl' : 'ltr';

  const steps = [
    browser === 'ios-chrome' ? t('steps.shareChrome') : t('steps.shareSafari'),
    t('steps.addToHomeScreen'),
    t('steps.confirm'),
  ];

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      onAnimationEnd={(isOpen) => {
        if (!isOpen) onClosed?.();
      }}
    >
      <DrawerContent dir={dir} className="mx-auto max-w-md">
        <DrawerHeader>
          <DrawerTitle className="text-lg font-bold">{t('title')}</DrawerTitle>
          <DrawerDescription>{t('subtitle')}</DrawerDescription>
        </DrawerHeader>

        {/* An explanatory video goes above the steps once it is recorded. */}
        <ol className="flex flex-col gap-4 px-5 pt-1">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="bg-primary/15 text-primary flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-extrabold">
                {i + 1}
              </span>
              <span className="pt-0.5 text-[15px] leading-6">{step}</span>
            </li>
          ))}
        </ol>

        <p className="text-muted-foreground flex items-start gap-2 px-5 pt-5 text-[13px] leading-normal">
          <IconInfoCircle className="mt-0.5 size-4 shrink-0" strokeWidth={2} />
          {t('signInNote')}
        </p>

        <DrawerFooter className="pt-5 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <Button size="lg" className="h-12 rounded-xl text-[15px] font-bold" onClick={onDone}>
            {t('done')}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
