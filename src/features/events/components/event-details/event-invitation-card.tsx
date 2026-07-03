'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useActionState, startTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  IconLoader2,
  IconPhoto,
  IconUpload,
  IconX,
  IconDeviceFloppy,
} from '@tabler/icons-react';
import { CheckCircle2, AlertTriangle, Mail } from 'lucide-react';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemPreview,
  FileUploadItemDelete,
} from '@/components/ui/file-upload';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { uploadInvitationImage } from '@/lib/storage';
import { EventDetailsUpdateSchema, UpdateEventDetailsState } from '../../schemas';
import { updateEventDetails } from '../../actions';

const InvitationCardSchema = EventDetailsUpdateSchema.pick({ id: true, invitations: true });
type InvitationCardValues = z.infer<typeof InvitationCardSchema>;

interface EventInvitationCardProps {
  eventId: string;
  imageUrl?: string;
}

export function EventInvitationCard({
  eventId,
  imageUrl: existingUrl,
}: EventInvitationCardProps) {
  const t = useTranslations('eventDetails.invitation');
  const tHeader = useTranslations('eventDetails.header');

  const form = useForm<InvitationCardValues>({
    resolver: zodResolver(InvitationCardSchema),
    defaultValues: {
      id: eventId,
      invitations: {
        imageUrl: existingUrl,
      },
    },
  });

  const isDirty = form.formState.isDirty;

  const [files, setFiles] = React.useState<File[]>([]);
  const [previewUrl, setPreviewUrl] = React.useState<string | undefined>(existingUrl);
  const [isRemoved, setIsRemoved] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const uploadingFileRef = React.useRef<File | null>(null);

  // Sync preview when existingUrl prop changes (after server re-render post-save)
  React.useEffect(() => {
    if (existingUrl && !isRemoved) {
      setPreviewUrl(existingUrl);
    }
  }, [existingUrl, isRemoved]);

  const [, formAction, isPending] = useActionState(
    async (_prev: UpdateEventDetailsState | null, formData: FormData) => {
      try {
        const result = await updateEventDetails(formData);
        if (result.success) {
          toast.success(result.message);
          form.reset(form.getValues());
        } else {
          toast.error(result.message);
        }
        return result;
      } catch {
        toast.error('Something went wrong');
        return null;
      }
    },
    null,
  );

  const onSubmit = (values: InvitationCardValues) => {
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object') formData.append(key, JSON.stringify(value));
        else formData.append(key, String(value));
      }
    });
    startTransition(() => formAction(formData));
  };

  const handleValueChange = async (newFiles: File[]) => {
    setFiles(newFiles);
    setUploadError(null);

    if (newFiles.length > 0) {
      const file = newFiles[0];

      if (uploadingFileRef.current === file) return;

      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setIsRemoved(false);

      uploadingFileRef.current = file;
      setIsUploading(true);
      try {
        const result = await uploadInvitationImage(file, eventId);

        if (result.error) {
          setUploadError(result.error);
          setFiles([]);
          setPreviewUrl(existingUrl);
          return;
        }

        if (result.url) {
          form.setValue('invitations.imageUrl', result.url, {
            shouldDirty: true,
          });
        }
      } catch {
        setUploadError(t('failedUpload'));
        setFiles([]);
        setPreviewUrl(existingUrl);
      } finally {
        setIsUploading(false);
        uploadingFileRef.current = null;
      }
    }
  };

  const handleRemove = () => {
    setFiles([]);
    setPreviewUrl(undefined);
    setIsRemoved(true);
    setUploadError(null);
    form.setValue('invitations.imageUrl', '', { shouldDirty: true });
  };

  const hasPreview = previewUrl && !isRemoved;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="size-4 shrink-0 text-primary" />
              <CardTitle className="text-xl font-bold">{t('title')}</CardTitle>
            </div>
            <CardDescription>{t('description')}</CardDescription>
            {isDirty && (
              <CardAction className="animate-in fade-in-0 zoom-in-95 duration-200">
                <Button type="submit" size="sm" disabled={isPending || isUploading}>
                  <IconDeviceFloppy className="size-4" />
                  {isPending ? tHeader('saving') : tHeader('save')}
                </Button>
              </CardAction>
            )}
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="flex flex-col items-center">
              <FileUpload
                value={files}
                onValueChange={handleValueChange}
                accept="image/*"
                maxFiles={1}
                maxSize={5 * 1024 * 1024}
                className="contents"
                disabled={isUploading}
              >
                {hasPreview ? (
                  <div className="group relative aspect-[3/4] w-56 overflow-hidden rounded-lg border-0">
                    {isUploading && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/50">
                        <div className="flex flex-col items-center gap-2 text-white">
                          <IconLoader2 size={32} className="animate-spin" />
                          <span className="text-sm">{t('uploading')}</span>
                        </div>
                      </div>
                    )}
                    {files.length > 0 ? (
                      <FileUploadItem
                        value={files[0]}
                        className="size-full border-0 bg-transparent p-0"
                      >
                        <FileUploadItemPreview className="size-full rounded-lg border-0 bg-transparent [&>img]:size-full [&>img]:object-cover" />
                        <FileUploadItemDelete asChild>
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 size-8 opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                            type="button"
                            onClick={handleRemove}
                            disabled={isUploading}
                          >
                            <IconX size={16} />
                            <span className="sr-only">{t('removeImage')}</span>
                          </Button>
                        </FileUploadItemDelete>
                      </FileUploadItem>
                    ) : (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previewUrl}
                          alt="Invitation"
                          className="size-full object-cover"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 size-8 opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                          type="button"
                          onClick={handleRemove}
                          disabled={isUploading}
                        >
                          <IconX size={16} />
                          <span className="sr-only">{t('removeImage')}</span>
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  <FileUploadDropzone
                    className={cn(
                      'aspect-[3/4] w-56 cursor-pointer rounded-lg border-2 border-dashed',
                      'bg-gradient-to-br from-slate-50 to-slate-100/80',
                      'transition-all duration-200 ease-out',
                      'hover:border-primary/40 hover:bg-primary/5',
                      'data-[dragging]:border-primary data-[dragging]:bg-primary/10',
                      uploadError && 'border-destructive',
                    )}
                  >
                    <div className="flex flex-col items-center justify-center gap-3 text-center">
                      <div className="rounded-full bg-slate-200/80 p-3">
                        <IconPhoto size={24} className="text-slate-400" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-600">
                          {t('dropImage')}
                        </p>
                        <p className="text-xs text-slate-400">{t('clickToBrowse')}</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-1 gap-1.5"
                      >
                        <IconUpload size={14} />
                        {t('upload')}
                      </Button>
                    </div>
                  </FileUploadDropzone>
                )}
              </FileUpload>
              {uploadError && (
                <p className="text-destructive mt-2 text-sm">{uploadError}</p>
              )}
            </div>
            <div
              className={cn(
                'flex w-full items-start gap-3 rounded-lg p-3 text-sm',
                hasPreview
                  ? 'bg-green-50 text-green-800'
                  : 'bg-amber-50 text-amber-800',
              )}
            >
              {hasPreview ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              ) : (
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              )}
              <div>
                <p className="font-medium">
                  {hasPreview ? t('status.set.title') : t('status.notSet.title')}
                </p>
                <p className="text-xs opacity-80">
                  {hasPreview
                    ? t('status.set.description')
                    : t('status.notSet.description')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
