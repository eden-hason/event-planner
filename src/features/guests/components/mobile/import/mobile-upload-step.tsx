'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { IconUpload, IconDownload, IconFileSpreadsheet } from '@tabler/icons-react';
import { GoogleDriveIcon } from '@/components/icons';
import { isExcelFile } from '@/features/guests/utils/parse-csv';
import { preloadGoogleDrivePicker } from '@/features/guests/utils/google-drive-picker';
import { MAX_IMPORT_FILE_BYTES } from '@/features/guests/utils/import-guests';
import { useGuestTemplateDownload } from '@/features/guests/hooks/use-guest-template-download';

const ACCEPT =
  '.csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel';

const KULULU_FIELD_KEYS = [
  ['fieldName', true],
  ['fieldPhone', false],
  ['fieldAmount', false],
  ['fieldSide', false],
  ['fieldGroup', false],
] as const;

interface MobileUploadStepProps {
  onFileSelected: (file: File) => void;
  onError: (message: string) => void;
  onSelectGoogleDrive: () => void;
  isConnectingToDrive: boolean;
}

function isAcceptedFile(file: File): boolean {
  return (
    file.type === 'text/csv' ||
    file.name.toLowerCase().endsWith('.csv') ||
    isExcelFile(file)
  );
}

export function MobileUploadStep({
  onFileSelected,
  onError,
  onSelectGoogleDrive,
  isConnectingToDrive,
}: MobileUploadStepProps) {
  const t = useTranslations('guests.import');
  const tm = useTranslations('guests.import.mobile.upload');
  const template = useGuestTemplateDownload();
  const inputRef = useRef<HTMLInputElement>(null);

  // Scripts loaded ahead of the tap rather than on it: `requestAccessToken()`
  // has to open Google's consent popup within the same tick as the click or
  // popup blockers can eat it, and a cold-cache script load would otherwise
  // land after that window - see `preloadGoogleDrivePicker`.
  useEffect(() => {
    preloadGoogleDrivePicker();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!isAcceptedFile(file)) {
      onError(t('parseFailed'));
      return;
    }
    if (file.size > MAX_IMPORT_FILE_BYTES) {
      onError(t('parseFailed'));
      return;
    }
    onFileSelected(file);
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={handleChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="border-primary/40 bg-primary/5 flex flex-col items-center gap-2.5 rounded-2xl border-2 border-dashed px-5 py-8 text-center"
      >
        <span className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-2xl">
          <IconUpload size={26} />
        </span>
        <span className="text-[16px] font-bold">{tm('chooseFile')}</span>
        <span className="text-muted-foreground text-[13px] leading-relaxed">
          {tm('fileTypes')}
          <br />
          {tm('firstRowHint')}
        </span>
      </button>

      <div className="flex items-center gap-2.5">
        <span className="bg-border h-px flex-1" />
        <span className="text-muted-foreground text-xs">{tm('orDivider')}</span>
        <span className="bg-border h-px flex-1" />
      </div>

      <button
        type="button"
        onClick={onSelectGoogleDrive}
        disabled={isConnectingToDrive}
        className="flex items-center gap-3 rounded-xl border p-3.5 text-start disabled:opacity-60"
      >
        <span className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg">
          <GoogleDriveIcon size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold">
            {isConnectingToDrive ? tm('connectingToDrive') : tm('driveButtonTitle')}
          </div>
          <div className="text-muted-foreground text-xs">
            {tm('driveButtonSubtitle')}
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={template.download}
        disabled={template.isDownloading}
        className="flex items-center gap-3 rounded-xl border p-3.5 text-start disabled:opacity-60"
      >
        <span className="bg-rsvp-confirmed-tint text-rsvp-confirmed-strong flex size-10 shrink-0 items-center justify-center rounded-lg">
          <IconFileSpreadsheet size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold">
            {t('template.title')}
          </div>
          <div className="text-muted-foreground text-xs leading-relaxed">
            {t('template.description')}
          </div>
        </div>
        <span className="text-primary flex shrink-0 items-center gap-1 text-xs font-semibold">
          <IconDownload size={14} />
          {template.isDownloading
            ? t('template.downloading')
            : t('template.download')}
        </span>
      </button>

      <div className="mt-auto flex flex-col gap-2 rounded-xl border p-3.5">
        <span className="text-[13px] font-semibold">
          {tm('whatYouCanImport')}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {KULULU_FIELD_KEYS.map(([key, required]) => (
            <span
              key={key}
              className={
                required
                  ? 'bg-primary/10 text-primary rounded-full px-2.5 py-1 text-xs font-semibold'
                  : 'bg-muted text-muted-foreground rounded-full px-2.5 py-1 text-xs'
              }
            >
              {t(`map.${key}`)}
              {required ? ' *' : ''}
            </span>
          ))}
        </div>
        <p className="text-muted-foreground text-xs leading-relaxed">
          {tm('columnsNote')}
        </p>
      </div>
    </div>
  );
}
