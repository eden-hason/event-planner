'use client';

import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { useLocale, useTranslations } from 'next-intl';
import {
  IconMail,
  IconPhoto,
  IconPlayerPlayFilled,
  IconUpload,
  IconUserCheck,
  IconMovie,
} from '@tabler/icons-react';
import { TriangleAlert } from 'lucide-react';
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadTrigger,
} from '@/components/ui/file-upload';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { uploadInvitationImage, uploadInvitationVideo } from '@/lib/storage';
import { cn } from '@/lib/utils';
import type { EventDetailsFormValues } from '../../schemas';
import { SECTION_IDS, useEventDetails } from './event-details-context';
import { SectionCard, SectionStatus, type SectionStatusTone } from './section-card';
import { formatMegabytes, useSingleUpload, type RejectedFile } from './use-single-upload';

const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
// WhatsApp's own limits for a video header: MP4, up to 16 MB.
const VIDEO_MAX_BYTES = 16 * 1024 * 1024;

type InvitationMedia = EventDetailsFormValues['messageMedia']['invitation'];

const FOLLOW_UP_TYPES: readonly { value: 'none' | 'image'; icon: React.ReactNode }[] = [
  { value: 'none', icon: null },
  { value: 'image', icon: <IconPhoto size={16} /> },
];

const TYPES: readonly { value: InvitationMedia; icon: React.ReactNode }[] = [
  { value: 'none', icon: null },
  { value: 'image', icon: <IconPhoto size={16} /> },
  { value: 'video', icon: <IconMovie size={16} /> },
];

/**
 * What the WhatsApp messages attach, on the current Message Plan: the
 * Invitation's choice (nothing, the invitation image or the video) with the
 * file itself, then whether the Follow-ups carry the Event's image. Beside an
 * image Invitation that is the same picture (a checkbox); beside a video or a
 * text-only one the Follow-ups get their own Image / Text only choice and the
 * upload, into the same image slot.
 *
 * The files are the Event's and upload the moment they are picked; the URLs
 * and the choices are saved with the page. The choices are stored on the
 * Schedules (see `updateMessageMedia`), so the Schedules page only shows them.
 */
export function MediaSection() {
  const t = useTranslations('eventDetails.media');
  const tTypes = useTranslations('schedules.actionTypes');
  const form = useFormContext<EventDetailsFormValues>();
  const { eventId, media, isSaving } = useEventDetails();

  const choice = form.watch('messageMedia.invitation');
  const reuse = form.watch('messageMedia.followUps');
  const imageUrl = form.watch('invitations.imageUrl');
  const videoUrl = form.watch('invitationVideoUrl');

  const image = useSingleUpload({
    upload: (file) => uploadInvitationImage(file, eventId),
    maxBytes: IMAGE_MAX_BYTES,
    onUploaded: (url) => form.setValue('invitations.imageUrl', url, { shouldDirty: true }),
  });
  const video = useSingleUpload({
    upload: (file) => uploadInvitationVideo(file, eventId),
    maxBytes: VIDEO_MAX_BYTES,
    onUploaded: (url) => form.setValue('invitationVideoUrl', url, { shouldDirty: true }),
  });

  if (!media) return null;

  const invitationEditable = media.invitation?.editable ?? false;
  const slot = choice === 'image' ? image : choice === 'video' ? video : null;
  const fileUrl = choice === 'image' ? imageUrl : choice === 'video' ? videoUrl : '';

  const pick = (next: InvitationMedia) => {
    form.setValue('messageMedia.invitation', next, { shouldDirty: true });
    // Moving to an image Invitation restores the saved reuse choice, or the
    // design's default (on). Any other move keeps the Follow-ups' choice: the
    // image is the Event's, so it stays valid beside a video or no file.
    if (next !== 'image') return;
    const saved = form.formState.defaultValues?.messageMedia;
    const restored = saved?.invitation === 'image' ? Boolean(saved.followUps) : true;
    form.setValue('messageMedia.followUps', restored, { shouldDirty: true });
  };

  const setFollowUpImage = (on: boolean) =>
    form.setValue('messageMedia.followUps', on, { shouldDirty: true });

  let invitationChip: { tone: SectionStatusTone; label: string };
  if (media.invitation && !invitationEditable) invitationChip = { tone: 'muted', label: t('chips.sent') };
  else if (slot?.rejected) invitationChip = { tone: 'error', label: t('chips.failed') };
  else if (slot?.pending) invitationChip = { tone: 'pending', label: t('chips.uploading') };
  else if (choice === 'none') invitationChip = { tone: 'muted', label: t('chips.textOnly') };
  else if (fileUrl) invitationChip = { tone: 'ready', label: t('chips.ready') };
  else invitationChip = { tone: 'missing', label: t('chips.missing') };

  const followUps = media.followUps;
  const followUpsOpen = followUps.editableIds.length > 0;
  // Beside a video or a text-only Invitation the Follow-ups upload the image
  // themselves, so its upload state is theirs.
  const ownUpload = choice !== 'image' && reuse;
  let followUpChip: { tone: SectionStatusTone; label: string };
  if (!followUpsOpen) followUpChip = { tone: 'muted', label: t('chips.sent') };
  else if (ownUpload && image.rejected) followUpChip = { tone: 'error', label: t('chips.failed') };
  else if (ownUpload && image.pending) followUpChip = { tone: 'pending', label: t('chips.uploading') };
  else if (reuse && imageUrl) followUpChip = { tone: 'ready', label: t('chips.ready') };
  else if (reuse) followUpChip = { tone: 'missing', label: t(ownUpload ? 'chips.missing' : 'chips.waiting') };
  else followUpChip = { tone: 'muted', label: t('chips.textOnly') };

  return (
    <SectionCard
      id={SECTION_IDS.invitation}
      icon={<IconPhoto className="text-primary" stroke={2} />}
      title={t('title')}
      description={t('description')}
      contentClassName="flex flex-col gap-5"
    >
      {media.invitation && (
        <Step
          icon={<IconMail size={20} />}
          eyebrow={
            <>
              {t('messageOne')} <bdi dir="ltr">1</bdi>
            </>
          }
          title={t('invitationTitle')}
          chip={<SectionStatus tone={invitationChip.tone} label={invitationChip.label} />}
        >
          <div
            role="group"
            aria-label={t('typeGroup')}
            className="bg-muted flex gap-1 rounded-xl p-1"
          >
            {TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                aria-pressed={choice === type.value}
                disabled={!invitationEditable || isSaving}
                onClick={() => pick(type.value)}
                className={cn(
                  'flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[9px] border px-3.5 text-sm font-semibold transition-colors',
                  'disabled:cursor-not-allowed disabled:opacity-60',
                  choice === type.value
                    ? 'bg-background text-primary border-primary/30 shadow-xs'
                    : 'text-muted-foreground hover:text-foreground border-transparent',
                )}
              >
                {type.icon}
                {t(`types.${type.value}`)}
              </button>
            ))}
          </div>

          {!invitationEditable && (
            <p className="text-muted-foreground text-xs">{t('invitationSent')}</p>
          )}

          {choice === 'none' && (
            <div className="bg-muted/60 text-muted-foreground rounded-xl px-4 py-3.5 text-sm">
              {t('noneNote')}
            </div>
          )}

          {slot && choice !== 'none' && (
            <MediaFile
              key={choice}
              kind={choice}
              slot={slot}
              url={fileUrl}
              uploadLabel={choice === 'video' ? t('uploadVideo') : t('uploadImage')}
              disabled={isSaving}
            />
          )}
        </Step>
      )}

      {media.invitation && followUps.count > 0 && <hr className="border-border" />}

      {followUps.count > 0 && (
        <Step
          icon={<IconUserCheck size={20} />}
          eyebrow={
            <>
              {t(followUps.count === 1 ? 'messageOne' : 'messageMany')}{' '}
              <bdi dir="ltr">{followUps.count === 1 ? '2' : `2–${followUps.count + 1}`}</bdi>
            </>
          }
          title={tTypes('follow_up')}
          chip={<SectionStatus tone={followUpChip.tone} label={followUpChip.label} />}
        >
          {!followUpsOpen ? (
            <p className="text-muted-foreground text-xs">{t('followUpsSent')}</p>
          ) : choice === 'image' ? (
            <>
              <label className="bg-muted/60 flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl px-3.5 text-sm font-semibold">
                <Checkbox
                  checked={reuse}
                  disabled={isSaving}
                  onCheckedChange={(checked) =>
                    form.setValue('messageMedia.followUps', checked === true, { shouldDirty: true })
                  }
                />
                {t('reuse')}
              </label>
              {reuse && (
                <div className="flex items-center gap-3 rounded-[14px] border p-2.5">
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt={t('imageName')} className="size-11 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-lg">
                      <IconPhoto size={20} />
                    </span>
                  )}
                  <span className="text-muted-foreground text-sm">
                    {imageUrl ? t('reuseReady', { count: followUps.editableIds.length }) : t('reuseWaiting')}
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              <div
                role="group"
                aria-label={t('followUpTypeGroup')}
                className="bg-muted flex gap-1 rounded-xl p-1"
              >
                {FOLLOW_UP_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    aria-pressed={reuse === (type.value === 'image')}
                    disabled={isSaving}
                    onClick={() => setFollowUpImage(type.value === 'image')}
                    className={cn(
                      'flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[9px] border px-3.5 text-sm font-semibold transition-colors',
                      'disabled:cursor-not-allowed disabled:opacity-60',
                      reuse === (type.value === 'image')
                        ? 'bg-background text-primary border-primary/30 shadow-xs'
                        : 'text-muted-foreground hover:text-foreground border-transparent',
                    )}
                  >
                    {type.icon}
                    {t(`types.${type.value}`)}
                  </button>
                ))}
              </div>
              {choice === 'video' ? (
                <p className="text-muted-foreground text-[13px]">{t('followUpsVideoNote')}</p>
              ) : !reuse ? (
                <p className="text-muted-foreground text-[13px]">{t('followUpsNoneNote')}</p>
              ) : null}
              {reuse && (
                <MediaFile
                  kind="image"
                  slot={image}
                  url={imageUrl}
                  uploadLabel={t('uploadFollowUpImage')}
                  uploadHint={t('followUpsFor', { count: followUps.editableIds.length })}
                  row
                  disabled={isSaving}
                />
              )}
            </>
          )}
        </Step>
      )}
    </SectionCard>
  );
}

/** One stage of the card: its icon tile, an eyebrow naming which messages, the title and a status chip. */
function Step({
  icon,
  eyebrow,
  title,
  chip,
  children,
}: {
  icon: React.ReactNode;
  eyebrow: React.ReactNode;
  title: string;
  chip: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-[10px]"
        >
          {icon}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-primary text-xs font-bold">{eyebrow}</span>
          <strong className="text-base leading-tight">{title}</strong>
        </div>
        {chip}
      </div>
      {children}
    </div>
  );
}

/**
 * One file slot: the drop zone, the upload in progress, a refusal, or the
 * file with Replace. Used by the Invitation step and, for the image, by the
 * Follow-ups step beside a video or text-only Invitation.
 */
function MediaFile({
  kind,
  slot,
  url,
  uploadLabel,
  uploadHint,
  row,
  disabled,
}: {
  kind: 'image' | 'video';
  slot: ReturnType<typeof useSingleUpload>;
  url: string;
  uploadLabel: string;
  /** Appended to the formats line, e.g. which messages the file goes with. */
  uploadHint?: string;
  /** The drop zone as one row, icon beside the text, rather than stacked. */
  row?: boolean;
  disabled: boolean;
}) {
  const t = useTranslations('eventDetails.media');
  const locale = useLocale();
  const video = kind === 'video';
  const max = video ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES;
  const maxLabel = formatMegabytes(max);
  const formats = video ? t('videoFormats', { max: maxLabel }) : t('imageFormats', { max: maxLabel });

  return (
    <FileUpload
      value={slot.files}
      onValueChange={slot.onValueChange}
      onFileReject={slot.onFileReject}
      accept={video ? 'video/mp4' : 'image/*'}
      // FileUpload falls back to 'ltr' and sets it on its own root.
      dir={locale === 'he' ? 'rtl' : 'ltr'}
      maxFiles={1}
      maxSize={max}
      disabled={slot.pending !== null || disabled}
      className="contents"
    >
      {slot.rejected ? (
        <Rejected rejected={slot.rejected} video={video} max={maxLabel} />
      ) : slot.pending ? (
        <div className="bg-muted flex h-[120px] flex-col items-center justify-center gap-2.5 overflow-hidden rounded-[14px] border">
          <span className="text-muted-foreground text-[13px] font-bold">{t('uploading')}</span>
          <span className="bg-border block h-1.5 w-[180px] overflow-hidden rounded-full">
            <span className="bg-primary block h-full w-2/3 animate-pulse rounded-full" />
          </span>
          <span className="text-muted-foreground max-w-full truncate px-4 text-[11.5px]">
            {t('fileMeta', { name: slot.pending.name, size: formatMegabytes(slot.pending.size) })}
          </span>
        </div>
      ) : !video && url ? (
        <div className="flex items-center gap-3 rounded-[14px] border p-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={t('imageName')} className="size-16 shrink-0 rounded-[10px] object-cover" />
          <FileLabel name={t('imageName')} meta={t('imageMeta')} />
          <ReplaceButton label={t('replace')} />
        </div>
      ) : video && url ? (
        <VideoFile url={url} />
      ) : (
        <FileUploadDropzone
          className={cn(
            'border-primary/40 bg-primary/5 cursor-pointer rounded-[14px] border-[1.5px] border-dashed',
            'hover:bg-primary/10 transition-colors duration-200',
            'data-[dragging]:border-primary data-[dragging]:bg-primary/10',
            row ? 'px-4 py-4' : 'px-4 py-[22px]',
          )}
        >
          <div className={cn('flex items-center gap-3', row ? 'text-start' : 'flex-col gap-2 text-center')}>
            <span className="bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center rounded-xl">
              <IconUpload size={22} />
            </span>
            <div className={cn('flex min-w-0 flex-col', row ? 'gap-0.5' : 'gap-2')}>
              <p className="text-base font-bold">{uploadLabel}</p>
              <p className="text-muted-foreground text-[13px]">
                {row
                  ? [formats, uploadHint].filter(Boolean).join(' · ')
                  : t('dropHint', { formats: uploadHint ? `${formats} · ${uploadHint}` : formats })}
              </p>
            </div>
          </div>
        </FileUploadDropzone>
      )}
    </FileUpload>
  );
}

/**
 * The saved video: a dark frame with a play button and its length, then its
 * name, length and size beside Replace. Playing hands over to the native
 * controls. The size comes from a HEAD request and is left out if it fails.
 */
function VideoFile({ url }: { url: string }) {
  const t = useTranslations('eventDetails.media');
  const ref = React.useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = React.useState(false);
  const [duration, setDuration] = React.useState<number | null>(null);
  const [size, setSize] = React.useState<number | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setSize(null);
    fetch(url, { method: 'HEAD' })
      .then((response) => {
        const length = Number(response.headers.get('content-length'));
        if (!cancelled && response.ok && length > 0) setSize(length);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [url]);

  const length = duration !== null ? formatDuration(duration) : null;
  const meta = [t('videoMeta'), length, size !== null ? formatMegabytes(size) : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="flex flex-col gap-3">
      <div className="relative h-[180px] overflow-hidden rounded-[14px] bg-zinc-900">
        <video
          ref={ref}
          src={url}
          controls={playing}
          preload="metadata"
          playsInline
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
          className="size-full object-contain"
        />
        {!playing && (
          <>
            <button
              type="button"
              aria-label={t('play')}
              onClick={() => {
                setPlaying(true);
                void ref.current?.play();
              }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <span className="flex size-[52px] items-center justify-center rounded-full bg-white/90 text-zinc-900 shadow-md">
                <IconPlayerPlayFilled size={20} className="translate-x-px" />
              </span>
            </button>
            {length && (
              <span
                dir="ltr"
                className="pointer-events-none absolute start-2.5 bottom-2.5 rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-bold text-white"
              >
                {length}
              </span>
            )}
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <FileLabel name={t('videoName')} meta={meta} />
        <ReplaceButton label={t('replace')} />
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return '';
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function FileLabel({ name, meta }: { name: string; meta: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <strong className="truncate text-sm">{name}</strong>
      <span className="text-muted-foreground text-xs">{meta}</span>
    </div>
  );
}

function ReplaceButton({ label }: { label: string }) {
  return (
    <FileUploadTrigger asChild>
      <Button type="button" variant="ghost" className="text-primary hover:text-primary min-h-11 px-3 font-bold">
        {label}
      </Button>
    </FileUploadTrigger>
  );
}

function Rejected({ rejected, video, max }: { rejected: RejectedFile; video: boolean; max: string }) {
  const t = useTranslations('eventDetails.media');
  return (
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
              ? t('tooLarge', { name: rejected.name, size: formatMegabytes(rejected.size), max })
              : rejected.reason === 'wrongType'
                ? t(video ? 'wrongTypeVideo' : 'wrongTypeImage', { name: rejected.name })
                : t('fileMeta', { name: rejected.name, size: formatMegabytes(rejected.size) })}
          </p>
        </div>
      </div>
      <FileUploadTrigger asChild>
        <Button type="button" variant="outline" className="text-primary hover:text-primary h-9 rounded-[10px] font-bold">
          {t('pickAnother')}
        </Button>
      </FileUploadTrigger>
    </div>
  );
}
