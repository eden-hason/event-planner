'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  IconCircleCheckFilled,
  IconReplace,
  IconTrash,
  IconUpload,
} from '@tabler/icons-react';
import { TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';

import {
  FileUpload,
  FileUploadDropzone,
  FileUploadTrigger,
} from '@/components/ui/file-upload';
import { Button } from '@/components/ui/button';
import { uploadInvitationVideo } from '@/lib/storage';
import { cn } from '@/lib/utils';

import { updateInvitationVideo } from '../actions';
import { SettingsCard } from './settings-card';

// WhatsApp's own limits for a video header: MP4, up to 16 MB. The codec is not
// checked - a phone's MP4 export is H.264/AAC, and anything else fails at Meta.
const MAX_BYTES = 16 * 1024 * 1024;
const ACCEPT = 'video/mp4';

/**
 * "12.4MB" - the unit the limit is stated in, so the two read as one sentence.
 * A whole number drops its ".0", so the limit reads "16MB".
 */
function formatMegabytes(bytes: number): string {
  return `${Number((bytes / (1024 * 1024)).toFixed(1))}MB`;
}

interface RejectedFile {
  name: string;
  size: number;
  reason: 'tooLarge' | 'wrongType' | 'failed';
}

interface InvitationVideoCardProps {
  scheduleId: string;
  eventId: string;
  videoUrl: string | null;
  /** False once the Schedule is sent or otherwise closed: the video is shown, not changed. */
  editable: boolean;
  lockBadge?: React.ReactNode;
}

/**
 * The video a Bespoke Template sends as its header, uploaded from the Schedule
 * it rides on but stored on the Event.
 *
 * Saved the moment a file is picked rather than by the page's Save: the storage
 * URL is what gets saved, so there is nothing to hold back. Nothing stops the
 * Schedule being dated without one; the line under the dropzone says what that
 * costs.
 */
export function InvitationVideoCard({
  scheduleId,
  eventId,
  videoUrl,
  editable,
  lockBadge,
}: InvitationVideoCardProps) {
  const t = useTranslations('schedules.invitationVideo');
  const locale = useLocale();

  // Kept in step with the picker's own list so its one slot frees up after each
  // pick - see InvitationSection.
  const [files, setFiles] = React.useState<File[]>([]);
  const [removing, setRemoving] = React.useState(false);
  const [rejected, setRejected] = React.useState<RejectedFile | null>(null);
  const [pending, setPending] = React.useState<{ name: string; size: number } | null>(null);

  const maxLabel = formatMegabytes(MAX_BYTES);

  // Saves the URL (or clears it) behind a toast. The page picks up the new
  // video from the refresh the Server Action triggers. Never throws: a failure
  // is the toast's to show.
  const save = (url: string | null, success: string) => {
    const promise = updateInvitationVideo(scheduleId, url).then((result) => {
      if (!result.success) throw new Error(result.message ?? t('saveFailed'));
    });
    toast.promise(promise, {
      loading: t('saving'),
      success,
      error: (err) => (err instanceof Error ? err.message : t('saveFailed')),
    });
    return promise.catch(() => undefined);
  };

  const handleValueChange = async (next: File[]) => {
    setFiles(next);
    const file = next[0];
    if (!file) return;

    setRejected(null);
    setPending({ name: file.name, size: file.size });
    try {
      const upload = await uploadInvitationVideo(file, eventId);
      if (upload.error || !upload.url) {
        setRejected({ name: file.name, size: file.size, reason: 'failed' });
        return;
      }
      await save(upload.url, t('saved'));
    } catch {
      setRejected({ name: file.name, size: file.size, reason: 'failed' });
    } finally {
      setPending(null);
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
  };

  const handleRemove = async () => {
    setRejected(null);
    setRemoving(true);
    await save(null, t('removed'));
    setRemoving(false);
  };

  if (!editable) {
    return (
      <SettingsCard title={t('title')} aside={lockBadge}>
        {videoUrl ? (
          <UploadedStatus title={t('uploaded')} description={t('uploadedHint')} />
        ) : (
          <p className="text-muted-foreground text-xs">{t('missing')}</p>
        )}
      </SettingsCard>
    );
  }

  return (
    <SettingsCard title={t('title')} aside={lockBadge}>
      <FileUpload
        value={files}
        onValueChange={handleValueChange}
        onFileReject={handleReject}
        accept={ACCEPT}
        // FileUpload falls back to 'ltr' without a direction and sets it on its
        // own root, which would turn everything inside it left-to-right.
        dir={locale === 'he' ? 'rtl' : 'ltr'}
        maxFiles={1}
        maxSize={MAX_BYTES}
        disabled={removing || pending !== null}
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
        ) : pending ? (
          // No byte-level progress comes back from storage, so the bar says
          // "working" rather than pretending to a percentage.
          <div className="bg-muted flex h-[120px] flex-col items-center justify-center gap-2.5 overflow-hidden rounded-[14px] border">
            <span className="text-muted-foreground text-[13px] font-bold">{t('uploading')}</span>
            <span className="bg-border block h-1.5 w-[180px] overflow-hidden rounded-full">
              <span className="bg-primary block h-full w-2/3 animate-pulse rounded-full" />
            </span>
            <span className="text-muted-foreground max-w-full truncate px-4 text-[11.5px]">
              {t('fileMeta', { name: pending.name, size: formatMegabytes(pending.size) })}
            </span>
          </div>
        ) : videoUrl ? (
          <div className="flex flex-col gap-2.5">
            <UploadedStatus title={t('uploaded')} description={t('uploadedHint')} />
            <div className="flex flex-col gap-2 sm:flex-row">
              <FileUploadTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={removing}
                  className="h-9 rounded-[10px] font-semibold sm:flex-1"
                >
                  <IconReplace size={15} />
                  {t('replace')}
                </Button>
              </FileUploadTrigger>
              <Button
                type="button"
                variant="outline"
                disabled={removing}
                className="border-destructive/25 text-destructive hover:text-destructive hover:bg-destructive/5 h-9 rounded-[10px] font-semibold"
                onClick={handleRemove}
              >
                <IconTrash size={15} />
                {t('remove')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
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
            <p className="text-muted-foreground text-xs">{t('missing')}</p>
          </div>
        )}
      </FileUpload>
    </SettingsCard>
  );
}

/**
 * Where an uploaded video stands, in place of a second player: the message
 * preview beside this card already plays it as Guests will see it.
 */
function UploadedStatus({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-muted/50 flex items-center gap-2.5 rounded-[14px] border p-3">
      <IconCircleCheckFilled size={20} className="text-success shrink-0" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-[13.5px] font-bold">{title}</p>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
    </div>
  );
}
