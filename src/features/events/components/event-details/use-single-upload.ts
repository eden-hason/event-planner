'use client';

import * as React from 'react';

export interface RejectedFile {
  name: string;
  size: number;
  reason: 'tooLarge' | 'wrongType' | 'failed';
}

/** "12.4MB" - the unit the limit is stated in. A whole number drops its ".0". */
export function formatMegabytes(bytes: number): string {
  return `${Number((bytes / (1024 * 1024)).toFixed(1))}MB`;
}

/**
 * One file slot that uploads the moment a file is picked and hands the storage
 * URL to `onUploaded` (the form then saves it with the page). Feeds a
 * `FileUpload` root: `files`, `onValueChange`, `onFileReject`.
 *
 * The picker's list is kept in step so its single slot frees up after each
 * pick: `maxFiles={1}` counts what the component holds, and a replace would
 * otherwise be refused as one file too many.
 */
export function useSingleUpload({
  upload,
  maxBytes,
  onUploaded,
}: {
  upload: (file: File) => Promise<{ url?: string | null; error?: unknown }>;
  maxBytes: number;
  onUploaded: (url: string) => void;
}) {
  const [files, setFiles] = React.useState<File[]>([]);
  const [pending, setPending] = React.useState<{ name: string; size: number } | null>(null);
  const [rejected, setRejected] = React.useState<RejectedFile | null>(null);

  const onValueChange = async (next: File[]) => {
    setFiles(next);
    const file = next[0];
    if (!file) return;

    setRejected(null);
    setPending({ name: file.name, size: file.size });
    try {
      const result = await upload(file);
      if (result.error || !result.url) {
        setRejected({ name: file.name, size: file.size, reason: 'failed' });
        return;
      }
      onUploaded(result.url);
    } catch {
      setRejected({ name: file.name, size: file.size, reason: 'failed' });
    } finally {
      setPending(null);
      // A fresh array, so the picker's controlled value changes identity and
      // its one slot is empty again for the next pick.
      setFiles([]);
    }
  };

  const onFileReject = (file: File) => {
    setFiles([]);
    setRejected({
      name: file.name,
      size: file.size,
      reason: file.size > maxBytes ? 'tooLarge' : 'wrongType',
    });
  };

  return { files, onValueChange, onFileReject, pending, rejected };
}
