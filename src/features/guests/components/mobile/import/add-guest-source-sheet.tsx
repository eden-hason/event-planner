'use client';

import { useTranslations } from 'next-intl';
import { IconBrandWhatsapp, IconUpload, IconUserPlus } from '@tabler/icons-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { GoogleDriveIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

interface AddGuestSourceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectSingleGuest: () => void;
  onSelectUploadFile: () => void;
  onSelectGoogleDrive: () => void;
  onSelectWhatsApp: () => void;
}

/**
 * The mobile "Add guest" header button's landing spot: a choice between
 * entering one guest by hand, uploading a file, importing from Google Drive,
 * and picking people from the Owner's WhatsApp (backlog 0017), rather than
 * jumping straight into the single-guest form the way it used to.
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
  onSelectWhatsApp,
}: AddGuestSourceSheetProps) {
  const t = useTranslations('guests.import.mobile.sourceSheet');
  const select = (onSelect: () => void) => () => {
    onOpenChange(false);
    onSelect();
  };

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
          <SourceOption
            icon={<IconUserPlus size={20} />}
            iconClassName="bg-primary/10 text-primary"
            title={t('singleGuest')}
            description={t('singleGuestDescription')}
            onSelect={select(onSelectSingleGuest)}
          />
          <SourceOption
            icon={<IconUpload size={20} />}
            iconClassName="bg-primary/10 text-primary"
            title={t('uploadFile')}
            description={t('uploadFileDescription')}
            onSelect={select(onSelectUploadFile)}
          />
          <SourceOption
            icon={<GoogleDriveIcon size={18} />}
            iconClassName="bg-success/10"
            title={t('googleDrive')}
            description={t('googleDriveDescription')}
            badge={t('newBadge')}
            onSelect={select(onSelectGoogleDrive)}
          />
          <SourceOption
            icon={<IconBrandWhatsapp size={20} />}
            iconClassName="bg-success/10 text-success"
            title={t('whatsapp')}
            description={t('whatsappDescription')}
            badge={t('newBadge')}
            onSelect={select(onSelectWhatsApp)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SourceOption({
  icon,
  iconClassName,
  title,
  description,
  badge,
  onSelect,
}: {
  icon: React.ReactNode;
  iconClassName: string;
  title: string;
  description: string;
  badge?: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex items-center gap-3 rounded-xl border p-3.5 text-start"
    >
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-lg',
          iconClassName,
        )}
      >
        {icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-1.5 text-[15px] font-semibold">
          {title}
          {badge && (
            <span className="bg-success/15 text-success rounded-full px-1.5 py-0.5 text-[10px] font-bold">
              {badge}
            </span>
          )}
        </span>
        <span className="text-muted-foreground text-xs">{description}</span>
      </div>
    </button>
  );
}
