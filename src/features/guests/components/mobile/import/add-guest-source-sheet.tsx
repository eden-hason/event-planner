'use client';

import { useTranslations } from 'next-intl';
import { IconUpload, IconUserPlus } from '@tabler/icons-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { GoogleDriveIcon } from '@/components/icons';

interface AddGuestSourceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectSingleGuest: () => void;
  onSelectUploadFile: () => void;
  onSelectGoogleDrive: () => void;
}

/**
 * The mobile "Add guest" header button's landing spot: a choice between
 * entering one guest by hand, uploading a file, and importing from Google
 * Drive, rather than jumping straight into the single-guest form the way it
 * used to.
 *
 * That extra tap costs the most frequent action (adding one guest) a step it
 * didn't pay before, in exchange for making bulk import discoverable from the
 * one button hosts already reach for - it used to live only behind a download
 * icon in the export menu, which this sheet also replaces as the only way in.
 */
export function AddGuestSourceSheet({
  open,
  onOpenChange,
  onSelectSingleGuest,
  onSelectUploadFile,
  onSelectGoogleDrive,
}: AddGuestSourceSheetProps) {
  const t = useTranslations('guests.import.mobile.sourceSheet');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex flex-col gap-0 overflow-clip rounded-t-xl border-0 p-0 pb-[env(safe-area-inset-bottom)] data-[state=closed]:duration-200 data-[state=open]:duration-200"
      >
        <SheetHeader className="pb-2">
          <SheetTitle>{t('title')}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-2 px-4 pb-6">
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onSelectSingleGuest();
            }}
            className="flex items-center gap-3 rounded-xl border p-3.5 text-start"
          >
            <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
              <IconUserPlus size={20} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-[15px] font-semibold">{t('singleGuest')}</span>
              <span className="text-muted-foreground text-xs">
                {t('singleGuestDescription')}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onSelectUploadFile();
            }}
            className="flex items-center gap-3 rounded-xl border p-3.5 text-start"
          >
            <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
              <IconUpload size={20} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-[15px] font-semibold">{t('uploadFile')}</span>
              <span className="text-muted-foreground text-xs">
                {t('uploadFileDescription')}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onSelectGoogleDrive();
            }}
            className="flex items-center gap-3 rounded-xl border p-3.5 text-start"
          >
            <span className="bg-success/10 flex size-10 shrink-0 items-center justify-center rounded-lg">
              <GoogleDriveIcon size={18} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="flex items-center gap-1.5 text-[15px] font-semibold">
                {t('googleDrive')}
                <span className="bg-success/15 text-success rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                  {t('newBadge')}
                </span>
              </span>
              <span className="text-muted-foreground text-xs">
                {t('googleDriveDescription')}
              </span>
            </div>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
