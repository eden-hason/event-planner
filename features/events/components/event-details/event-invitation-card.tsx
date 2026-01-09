'use client';

import * as React from 'react';
import { Mail, Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

interface InvitationUploaderProps {
  label: string;
  name: 'invitations.frontImageUrl' | 'invitations.backImageUrl';
  existingUrl?: string;
  eventId: string;
  type: 'front' | 'back';
}

function InvitationUploader({
  label,
  name,
  existingUrl,
  eventId,
  type,
}: InvitationUploaderProps) {
  const form = useFormContext<EventDetailsUpdate>();
  const [files, setFiles] = React.useState<File[]>([]);
  const [previewUrl, setPreviewUrl] = React.useState<string | undefined>(
    existingUrl,
  );
  const [isRemoved, setIsRemoved] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  // Track the file currently being uploaded to prevent duplicate uploads
  const uploadingFileRef = React.useRef<File | null>(null);

  // Watch the form value to detect form reset (e.g., when Discard is clicked)
  const formValue = form.watch(name);

  // Reset local state when form is reset back to original value
  React.useEffect(() => {
    // If form value is reset to the original existingUrl, restore local state
    if (formValue === existingUrl && isRemoved) {
      setIsRemoved(false);
      setPreviewUrl(existingUrl);
      setFiles([]);
      setUploadError(null);
    }
  }, [formValue, existingUrl, isRemoved]);

  // Sync with existing URL when it changes (and not removed)
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

      // Prevent duplicate uploads - skip if already uploading this file
      if (uploadingFileRef.current === file) {
        return;
      }

      // Create preview immediately for better UX
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setIsRemoved(false);

      // Upload directly to Supabase Storage
      uploadingFileRef.current = file;
      setIsUploading(true);
      try {
        const result = await uploadInvitationImage(file, eventId, type);

        if (result.error) {
          setUploadError(result.error);
          setFiles([]);
          setPreviewUrl(existingUrl);
          return;
        }

        // Store only the URL in the form (not the base64 data)
        if (result.url) {
          form.setValue(name, result.url, { shouldDirty: true });
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
    // Set empty string to indicate removal (different from undefined which means "no change")
    form.setValue(name, '', { shouldDirty: true });
  };

  const hasPreview = previewUrl && !isRemoved;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-muted-foreground text-sm font-medium">{label}</span>
      <FileUpload
        value={files}
        onValueChange={handleValueChange}
        accept="image/*"
        maxFiles={1}
        maxSize={5 * 1024 * 1024} // 5MB
        className="w-full"
        disabled={isUploading}
      >
        {hasPreview ? (
          <div className="group relative aspect-[3/4] w-full overflow-hidden rounded-lg border-0 bg-[#F4E5D8] p-12">
            {/* Uploading overlay */}
            {isUploading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/50">
                <div className="flex flex-col items-center gap-2 text-white">
                  <Loader2 className="size-8 animate-spin" />
                  <span className="text-sm">Uploading...</span>
                </div>
              </div>
            )}
            {files.length > 0 ? (
              // New file uploaded - use FileUploadItem for proper handling
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
              // Existing URL - display with custom preview
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt={`${label} invitation`}
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
              'aspect-[3/4] w-full cursor-pointer rounded-lg border-2 border-dashed',
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
      {uploadError && <p className="text-destructive text-sm">{uploadError}</p>}
    </div>
  );
}

interface EventInvitationCardProps {
  eventId: string;
  frontImageUrl?: string;
  backImageUrl?: string;
}

export function EventInvitationCard({
  eventId,
  frontImageUrl,
  backImageUrl,
}: EventInvitationCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Mail className="h-5 w-5" />
          Event Invitation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <InvitationUploader
            label="FRONT"
            name="invitations.frontImageUrl"
            existingUrl={frontImageUrl}
            eventId={eventId}
            type="front"
          />
          <InvitationUploader
            label="BACK"
            name="invitations.backImageUrl"
            existingUrl={backImageUrl}
            eventId={eventId}
            type="back"
          />
        </div>
      </CardContent>
    </Card>
  );
}
