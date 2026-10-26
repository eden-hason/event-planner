'use client';

import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { IconDownload } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { downloadSheet, type SheetRow } from '../utils/export-budget';

interface DownloadSheetButtonProps {
  /** Built on click, so the file reflects any edits made since the page loaded. */
  getRows: () => SheetRow[];
  fileName: string;
  sheetName: string;
  className?: string;
}

/**
 * The list toolbars' download button, sized like the guests page's toolbar
 * buttons: an icon-only square below `md`, a labelled button from `md` up.
 */
export function DownloadSheetButton({
  getRows,
  fileName,
  sheetName,
  className,
}: DownloadSheetButtonProps) {
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
      size="icon"
      variant="outline"
      onClick={handleDownload}
      aria-label={t('downloadAria')}
      title={t('downloadAria')}
      className={cn(
        'bg-card text-muted-foreground size-10 shrink-0 rounded-[11px]',
        'md:bg-background md:text-foreground md:h-9 md:w-auto md:gap-[7px] md:rounded-[10px] md:px-3 md:text-[13.5px] md:font-semibold',
        className,
      )}
    >
      <IconDownload className="size-[18px] md:size-4" />
      <span className="max-md:sr-only">{t('download')}</span>
    </Button>
  );
}
