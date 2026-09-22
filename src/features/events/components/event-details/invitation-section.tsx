'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import {
  IconArrowsMaximize,
  IconLoader2,
  IconPhoto,
  IconTrash,
  IconUpload,
} from '@tabler/icons-react';
import { Mail, TriangleAlert } from 'lucide-react';
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
      icon={<Mail className="text-primary size-4 shrink-0" />}
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
        <div className="flex flex-col gap-3">
          {rejected ? (
            <div className="border-destructive/30 bg-destructive/5 flex flex-col gap-2 rounded-lg border p-3">
              <div className="flex items-start gap-2">
                <TriangleAlert className="text-destructive mt-0.5 size-4 shrink-0" />
                <div className="min-w-0">
                  <p className="text-destructive text-sm font-bold">
                    {rejected.reason === 'tooLarge'
                      ? t('tooLargeTitle')
                      : rejected.reason === 'wrongType'
                        ? t('wrongTypeTitle')
                        : t('failed')}
                  </p>
                  <p className="text-destructive/90 text-xs leading-relaxed">
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
                <Button type="button" variant="outline" size="sm" className="self-start">
                  <IconUpload size={15} />
                  {t('pickAnother')}
                </Button>
              </FileUploadTrigger>
            </div>
          ) : preview ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="group relative mx-auto aspect-[3/4] w-40 shrink-0 overflow-hidden rounded-lg border sm:mx-0">
                {isUploading && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/55 text-white">
                    <IconLoader2 size={26} className="animate-spin" />
                    <span className="text-xs font-medium">{t('uploading')}</span>
                  </div>
                )}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      aria-label={t('enlarge')}
                      className="absolute start-2 top-2 z-20 size-8 shadow-lg transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                      disabled={isUploading}
                    >
                      <IconArrowsMaximize size={16} />
                    </Button>
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

              <div className="flex min-w-0 flex-1 flex-col gap-2">
                {isUploading && pendingName ? (
                  <p className="text-muted-foreground text-xs">
                    {t('fileMeta', {
                      name: pendingName,
                      size: formatMegabytes(pendingSize),
                    })}
                  </p>
                ) : (
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {t('hint', { max: maxLabel })}
                  </p>
                )}
                <div className="flex gap-2">
                  <FileUploadTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      disabled={isUploading}
                    >
                      <IconUpload size={15} />
                      {t('replace')}
                    </Button>
                  </FileUploadTrigger>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={handleRemove}
                    disabled={isUploading}
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
                  'cursor-pointer rounded-lg border-2 border-dashed px-4 py-6',
                  'from-muted/40 to-muted bg-gradient-to-br',
                  'transition-colors duration-200',
                  'hover:border-primary/40 hover:bg-primary/5',
                  'data-[dragging]:border-primary data-[dragging]:bg-primary/10',
                )}
              >
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="bg-muted rounded-full p-2.5">
                    <IconPhoto size={22} className="text-muted-foreground" />
                  </div>
                  <p className="text-sm font-semibold">{t('dropzoneTitle')}</p>
                  <p className="text-muted-foreground text-xs">
                    {t('dropzoneHint', { max: maxLabel })}
                  </p>
                  <FileUploadTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="mt-1">
                      <IconUpload size={15} />
                      {t('upload')}
                    </Button>
                  </FileUploadTrigger>
                </div>
              </FileUploadDropzone>
              <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                {t('hintShort')}
              </p>
            </div>
          )}
        </div>
      </FileUpload>
    </SectionCard>
  );
}
