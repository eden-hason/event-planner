'use client';

import { Upload } from 'lucide-react';
import { FileUpload, FileUploadDropzone } from '@/components/ui/file-upload';

interface UploadStepProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
}

export function UploadStep({ files, onFilesChange }: UploadStepProps) {
  return (
    <FileUpload
      value={files}
      onValueChange={onFilesChange}
      accept=".csv,text/csv"
      maxFiles={1}
      maxSize={5 * 1024 * 1024}
    >
      <FileUploadDropzone className="min-h-[200px] cursor-pointer">
        <div className="flex flex-col items-center gap-3">
          <div className="bg-primary/10 text-primary rounded-full p-4">
            <Upload className="h-8 w-8" />
          </div>
          <div className="text-center">
            <p className="font-medium">Upload your guests list</p>
            <p className="text-muted-foreground text-sm">
              Drag and drop your .csv or .xlsx file here, or click to browse
            </p>
          </div>
        </div>
      </FileUploadDropzone>
    </FileUpload>
  );
}
