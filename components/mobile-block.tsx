'use client';

import { useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import { Monitor } from 'lucide-react';
import { IconDeviceMobile } from '@tabler/icons-react';

const MOBILE_ALLOWED_ROUTES = /^\/app\/[^/]+\/dashboard\/?$/;

export function MobileBlock({ children }: { children: React.ReactNode }) {
  const t = useTranslations('mobileBlock');
  const pathname = usePathname();

  if (MOBILE_ALLOWED_ROUTES.test(pathname)) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="flex h-svh flex-col items-center justify-center gap-4 p-8 text-center md:hidden">
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <Monitor className="h-12 w-12 text-muted-foreground" />
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">{t('title')}</h2>
            <p className="max-w-xs text-sm text-muted-foreground">
              {t('description')}
            </p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
          <IconDeviceMobile className="h-3.5 w-3.5 shrink-0" />
          {t('comingSoon')} {t('comingSoonBadge')}
        </span>
      </div>
      <div className="hidden md:contents">{children}</div>
    </>
  );
}
