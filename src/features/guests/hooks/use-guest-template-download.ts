'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { downloadGuestImportTemplate } from '@/features/guests/utils/guest-import-template';

/**
 * Downloads the guest-list Excel template in the current locale. Shared by
 * every place that offers it: the upload steps (desktop and phone) and the
 * Import menu / sheet on the guest list.
 */
export function useGuestTemplateDownload() {
  const locale = useLocale();
  const t = useTranslations('guests.import.template');
  const [isDownloading, setIsDownloading] = useState(false);

  const download = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      await downloadGuestImportTemplate(locale);
    } catch {
      toast.error(t('downloadFailed'));
    } finally {
      setIsDownloading(false);
    }
  };

  return { download, isDownloading };
}
