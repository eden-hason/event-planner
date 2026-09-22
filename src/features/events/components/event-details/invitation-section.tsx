'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import {
  IconArrowsMaximize,
  IconPhoto,
  IconTrash,
  IconUpload,
} from '@tabler/icons-react';
import { TriangleAlert } from 'lucide-react';
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadTrigger,
} from '@/components/ui/file-upload';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { uploadInvitationImage } from '@/lib/storage';
import { cn } from '@/lib/utils';
import type { EventDetailsFormValues } from '../../schemas';
import { SECTION_IDS } from './event-details-context';
import { SectionCard, SectionStatus, type SectionStatusTone } from './section-card';

const MAX_BYTES = 5 * 1024 * 1024;

/** "2.1MB" - the unit the limit is stated in, so the two read as one sentence. */
function formatMegabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

interface RejectedFile {
  name: string;
  size: number;
  reason: 'tooLarge' | 'wrongType' | 'failed';
}

/**
 * The one image that rides the first message a Guest gets.
 *
 * The upload happens the moment a file is picked - it has to, the storage URL is
 * what gets saved - so this section has states the rest of the page does not: a
 * file in flight, and a file that was refused. A refusal names the file and its
 * weight, because "too large" without a number is not something an Owner can act
 * on.
 */
export function InvitationSection() {
  const t = useTranslations('eventDetails.invitation');
  const form = useFormContext<EventDetailsFormValues>();

  // Kept in step with the picker's own list so the single slot frees up after
  // each pick: `maxFiles={1}` counts what the component holds, and a "replace"
  // would otherwise be refused as one file too many.
  const [files, setFiles] = React.useState<File[]>([]);
  const [isUploading, setIsUploading] = React.useState(false);
  const [rejected, setRejected] = React.useState<RejectedFile | null>(null);
  const [pendingName, setPendingName] = React.useState<string | null>(null);
  const [pendingSize, setPendingSize] = React.useState(0);
  const [localPreview, setLocalPreview] = React.useState<string | null>(null);

  const imageUrl = form.watch('invitations.imageUrl');
  const preview = localPreview ?? (imageUrl || null);

  // An object URL outlives the render that made it, so it is released when the
  // preview it backs is replaced or the section unmounts.
  React.useEffect(() => {
    if (!localPreview) return;
    return () => URL.revokeObjectURL(localPreview);
  }, [localPreview]);

  const handleValueChange = (next: File[]) => {
    setFiles(next);
    void handleUpload(next);
  };

  const handleUpload = async (picked: File[]) => {
    const file = picked[0];
    if (!file) return;

    setRejected(null);
    setPendingName(file.name);
    setPendingSize(file.size);
    setLocalPreview(URL.createObjectURL(file));
    setIsUploading(true);

    try {
      const result = await uploadInvitationImage(file, form.getValues('id'));
      if (result.error || !result.url) {
        setRejected({ name: file.name, size: file.size, reason: 'failed' });
        setLocalPreview(null);
        return;
      }
      form.setValue('invitations.imageUrl', result.url, { shouldDirty: true });
    } catch {
      setRejected({ name: file.name, size: file.size, reason: 'failed' });
      setLocalPreview(null);
    } finally {
      setIsUploading(false);
      setPendingName(null);
      // A fresh array, so the picker's controlled value changes identity and its
      // one slot is empty again for the next pick.
      setFiles([]);
    }
  };

  const handleReject = (file: File) => {
    setFiles([]);
    setRejected({
      name: file.name,
      size: file.size,
      reason: file.size > MAX_BYTES ? 'tooLarge' : 'wrongType',
    });
    setLocalPreview(null);
  };

  const handleRemove = () => {
    setRejected(null);
    setLocalPreview(null);
    form.setValue('invitations.imageUrl', '', { shouldDirty: true });
  };

  const tone: SectionStatusTone = rejected
    ? 'error'
    : isUploading
      ? 'pending'
      : preview
        ? 'ready'
        : 'missing';

  const statusLabel = rejected
    ? t('statusError')
    : isUploading
      ? t('statusUploading')
      : preview
        ? t('statusSet')
        : t('statusMissing');

  const maxLabel = formatMegabytes(MAX_BYTES);

  return (
    <SectionCard
      id={SECTION_IDS.invitation}
      icon={<IconPhoto className="text-primary" stroke={2} />}
      title={t('title')}
      status={<SectionStatus tone={tone} label={statusLabel} />}
    >
      <FileUpload
        value={files}
        onValueChange={handleValueChange}
        onFileReject={handleReject}
        accept="image/*"
        maxFiles={1}
        maxSize={MAX_BYTES}
        disabled={isUploading}
        className="contents"
      >
        {rejected ? (
          <div className="border-destructive/40 bg-destructive/10 flex flex-col gap-2.5 rounded-[14px] border p-3.5">
            <div className="flex items-start gap-2.5">
              <TriangleAlert className="text-destructive mt-0.5 size-4 shrink-0" />
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="text-[13.5px] font-bold">
                  {rejected.reason === 'tooLarge'
                    ? t('tooLargeTitle')
                    : rejected.reason === 'wrongType'
                      ? t('wrongTypeTitle')
                      : t('failed')}
                </p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {rejected.reason === 'tooLarge'
                    ? t('tooLarge', {
                      name: rejected.name,
                      size: formatMegabytes(rejected.size),
                      max: maxLabel,
                    })
                    : rejected.reason === 'wrongType'
                      ? t('wrongType', { name: rejected.name })
                      : t('fileMeta', {
                        name: rejected.name,
                        size: formatMegabytes(rejected.size),
                      })}
                </p>
              </div>
            </div>
            <FileUploadTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="text-primary hover:text-primary h-9 rounded-[10px] font-bold"
              >
                {t('pickAnother')}
              </Button>
            </FileUploadTrigger>
          </div>
        ) : isUploading ? (
          // No byte-level progress comes back from storage, so the bar says
          // "working" rather than pretending to a percentage.
          <div className="bg-muted flex h-[120px] flex-col items-center justify-center gap-2.5 overflow-hidden rounded-[14px] border">
            <span className="text-muted-foreground text-[13px] font-bold">
              {t('uploading')}
            </span>
            <span className="bg-border block h-1.5 w-[180px] overflow-hidden rounded-full">
              <span className="bg-primary block h-full w-2/3 animate-pulse rounded-full" />
            </span>
            {pendingName && (
              <span className="text-muted-foreground max-w-full truncate px-4 text-[11.5px]">
                {t('fileMeta', {
                  name: pendingName,
                  size: formatMegabytes(pendingSize),
                })}
              </span>
            )}
          </div>
        ) : preview ? (
          // A thumbnail beside its actions on a phone; the narrow desktop
          // column shows the image at full width with the actions under it.
          <div className="flex gap-3 lg:flex-col">
            <div className="relative h-36 w-[108px] shrink-0 overflow-hidden rounded-xl border lg:aspect-[3/4] lg:h-auto lg:w-full lg:rounded-[13px]">
              <Dialog>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    aria-label={t('enlarge')}
                    className="absolute end-1.5 top-1.5 z-10 flex size-[26px] items-center justify-center rounded-lg bg-black/55 text-white transition-colors hover:bg-black/70 lg:end-2 lg:top-2 lg:size-[30px] lg:rounded-[9px]"
                  >
                    <IconArrowsMaximize size={14} />
                  </button>
                </DialogTrigger>
                <DialogContent className="w-auto max-w-[calc(100%-2rem)] border-0 bg-transparent p-0 shadow-none sm:max-w-3xl">
                  <DialogTitle className="sr-only">{t('title')}</DialogTitle>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt={t('title')}
                    className="max-h-[85vh] w-full rounded-lg object-contain"
                  />
                </DialogContent>
              </Dialog>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt={t('title')} className="size-full object-cover" />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-2 lg:gap-3.5">
              <p className="text-muted-foreground text-xs leading-relaxed">
                <span className="lg:hidden">{t('hintShort')}</span>
                <span className="hidden lg:inline">{t('hint', { max: maxLabel })}</span>
              </p>
              <div className="flex flex-col gap-2 lg:flex-row">
                <FileUploadTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-[10px] font-semibold lg:flex-1"
                  >
                    {t('replace')}
                  </Button>
                </FileUploadTrigger>
                <Button
                  type="button"
                  variant="outline"
                  className="border-destructive/25 text-destructive hover:text-destructive hover:bg-destructive/5 h-9 rounded-[10px] font-semibold"
                  onClick={handleRemove}
                >
                  <IconTrash size={15} />
                  {t('remove')}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div data-readiness-focus>
            <FileUploadDropzone
              className={cn(
                'border-primary/40 bg-primary/5 cursor-pointer rounded-[14px] border-[1.5px] border-dashed px-3.5 py-[22px]',
                'transition-colors duration-200',
                'hover:bg-primary/10',
                'data-[dragging]:border-primary data-[dragging]:bg-primary/10',
              )}
            >
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="bg-primary/10 text-primary flex size-[42px] items-center justify-center rounded-xl">
                  <IconUpload size={20} />
                </span>
                <p className="text-[14.5px] font-bold">{t('upload')}</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {t('hint', { max: maxLabel })}
                </p>
              </div>
            </FileUploadDropzone>
          </div>
        )}
      </FileUpload>
    </SectionCard>
  );
}
