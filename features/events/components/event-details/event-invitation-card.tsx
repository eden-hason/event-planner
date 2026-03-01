'use client';

import * as React from 'react';
import { Mail, Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemPreview,
  FileUploadItemDelete,
} from '@/components/ui/file-upload';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { uploadInvitationImage } from '@/lib/storage';
import { EventDetailsUpdate } from '../../schemas';

interface EventInvitationCardProps {
  eventId: string;
  imageUrl?: string;
}

export function EventInvitationCard({
  eventId,
  imageUrl: existingUrl,
}: EventInvitationCardProps) {
  const form = useFormContext<EventDetailsUpdate>();
  const [files, setFiles] = React.useState<File[]>([]);
  const [previewUrl, setPreviewUrl] = React.useState<string | undefined>(existingUrl);
  const [isRemoved, setIsRemoved] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const uploadingFileRef = React.useRef<File | null>(null);

  const formValue = form.watch('invitations.imageUrl');

  // Reset local state when form is reset (e.g. Discard clicked)
  React.useEffect(() => {
    if (formValue === existingUrl && isRemoved) {
      setIsRemoved(false);
      setPreviewUrl(existingUrl);
      setFiles([]);
      setUploadError(null);
    }
  }, [formValue, existingUrl, isRemoved]);

  // Sync with existing URL when it changes
  React.useEffect(() => {
    if (existingUrl && !isRemoved) {
      setPreviewUrl(existingUrl);
    }
  }, [existingUrl, isRemoved]);

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
          form.setValue('invitations.imageUrl', result.url, { shouldDirty: true });
        }
      } catch {
        setUploadError('Failed to upload image');
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="rounded-md bg-primary/10 p-1.5">
            <Mail className="h-4 w-4 text-primary" />
          </div>
          Event Invitation
        </CardTitle>
        <CardDescription>
          This image will be sent to guests as the first message they receive when invited to your event.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
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
            <div className="group relative aspect-[3/4] w-56 overflow-hidden rounded-lg border-0 bg-[#F4E5D8] p-6">
              {isUploading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/50">
                  <div className="flex flex-col items-center gap-2 text-white">
                    <Loader2 className="size-8 animate-spin" />
                    <span className="text-sm">Uploading...</span>
                  </div>
                </div>
              )}
              {files.length > 0 ? (
                <FileUploadItem
                  value={files[0]}
                  className="size-full border-0 bg-transparent p-0"
                >
                  <FileUploadItemPreview className="size-full rounded-lg border-0 bg-transparent [&>img]:rounded-md [&>img]:object-contain" />
                  <FileUploadItemDelete asChild>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 size-8 opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                      type="button"
                      onClick={handleRemove}
                      disabled={isUploading}
                    >
                      <X className="size-4" />
                      <span className="sr-only">Remove image</span>
                    </Button>
                  </FileUploadItemDelete>
                </FileUploadItem>
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Invitation"
                    className="size-full rounded-md object-contain"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 size-8 opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                    type="button"
                    onClick={handleRemove}
                    disabled={isUploading}
                  >
                    <X className="size-4" />
                    <span className="sr-only">Remove image</span>
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
                  <ImageIcon className="size-6 text-slate-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-600">
                    Drop image here
                  </p>
                  <p className="text-xs text-slate-400">or click to browse</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-1 gap-1.5"
                >
                  <Upload className="size-3.5" />
                  Upload
                </Button>
              </div>
            </FileUploadDropzone>
          )}
        </FileUpload>
        {uploadError && <p className="text-destructive mt-2 text-sm">{uploadError}</p>}
      </CardContent>
    </Card>
  );
}
