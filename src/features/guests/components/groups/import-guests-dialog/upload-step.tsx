'use client';

import { useTranslations, useLocale } from 'next-intl';
import { IconUpload, IconX, IconFileTypeCsv, IconFileTypeXls, IconRefresh } from '@tabler/icons-react';
import { isExcelFile } from '@/features/guests/utils/parse-csv';
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadList,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadTrigger,
} from '@/components/ui/file-upload';
import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
} from '@/components/ui/item';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface UploadStepProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${sizes[i]}`;
}

export function UploadStep({ files, onFilesChange }: UploadStepProps) {
  const t = useTranslations('guests');
  const locale = useLocale();
  const dir = locale === 'he' ? 'rtl' : 'ltr';
  const hasFile = files.length > 0;

  const handleFilesChange = (newFiles: File[]) => {
    onFilesChange(newFiles.slice(-1));
  };

  return (
    <FileUpload
      value={files}
      onValueChange={handleFilesChange}
      accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
      maxSize={5 * 1024 * 1024}
      dir={dir}
    >
      <FileUploadDropzone
        className={cn(
          'min-h-[200px] cursor-pointer transition-all duration-300',
          hasFile && 'hidden',
        )}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="bg-primary/10 text-primary rounded-full p-4">
            <IconUpload size={32} />
          </div>
          <div className="text-center">
            <p className="font-medium">{t('import.upload.heading')}</p>
            <p className="text-muted-foreground text-sm">
              {t('import.upload.instruction')}
            </p>
          </div>
        </div>
      </FileUploadDropzone>

      <FileUploadList>
        {files.map((file) => (
          <FileUploadItem key={file.name} value={file} className="border-0 p-0 rounded-none gap-0">
            <Item variant="outline" className="flex-1">
              <ItemMedia variant="icon">
                {isExcelFile(file) ? <IconFileTypeXls /> : <IconFileTypeCsv />}
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{file.name}</ItemTitle>
                <ItemDescription>{formatBytes(file.size)}</ItemDescription>
              </ItemContent>
              <ItemActions>
                <FileUploadTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5">
                    <IconRefresh size={14} />
                    {t('import.upload.replace')}
                  </Button>
                </FileUploadTrigger>
                <FileUploadItemDelete asChild>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive size-8">
                    <IconX size={16} />
                  </Button>
                </FileUploadItemDelete>
              </ItemActions>
            </Item>
          </FileUploadItem>
        ))}
      </FileUploadList>
    </FileUpload>
  );
}
