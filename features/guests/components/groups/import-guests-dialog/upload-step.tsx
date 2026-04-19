'use client';

import { useTranslations } from 'next-intl';
import { IconUpload } from '@tabler/icons-react';
import { FileUpload, FileUploadDropzone } from '@/components/ui/file-upload';

interface UploadStepProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
}

export function UploadStep({ files, onFilesChange }: UploadStepProps) {
  const t = useTranslations('guests');

  return (
    <FileUpload
      value={files}
      onValueChange={onFilesChange}
      accept=".csv,text/csv"
      maxFiles={1}
      maxSize={5 * 1024 * 1024}
    >
      <FileUploadDropzone className="min-h-[200px] cursor-pointer">
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
    </FileUpload>
  );
}
