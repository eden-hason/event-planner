'use client';

import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { IconDownload } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { downloadSheet, type SheetRow } from '../utils/export-budget';

interface DownloadSheetButtonProps {
  /** Built on click, so the file reflects any edits made since the page loaded. */
  getRows: () => SheetRow[];
  fileName: string;
  sheetName: string;
}

export function DownloadSheetButton({ getRows, fileName, sheetName }: DownloadSheetButtonProps) {
  const t = useTranslations('budget.export');
  const locale = useLocale();

  const handleDownload = () => {
    toast.promise(downloadSheet(getRows(), { fileName, sheetName, rtl: locale === 'he' }), {
      loading: t('preparing'),
      success: () => t('downloaded'),
      error: () => t('failed'),
    });
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleDownload}
      aria-label={t('downloadAria')}
      title={t('downloadAria')}
    >
      <IconDownload size={16} />
      {t('download')}
    </Button>
  );
}
