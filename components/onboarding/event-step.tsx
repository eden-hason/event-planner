'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { DatePicker } from '@/components/ui/date-picker';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { BouncingBallIcon } from '@/components/ui/icons/svg-spinners-bouncing-ball';
import { XIcon, FileSpreadsheet } from 'lucide-react';
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadList,
  FileUploadItem,
  FileUploadItemPreview,
  FileUploadItemMetadata,
  FileUploadItemDelete,
} from '@/components/ui/file-upload';
import {
  OnboardingFormData,
  FileMetadata,
  FileMetadataSchema,
} from '@/lib/schemas/onboarding';
import { createClient } from '@/utils/supabase/client';
import { validateCSVFile } from '@/lib/utils/validate-csv';

const EventStepSchema = z.object({
  eventDate: z.date({
    message: 'Event date is required',
  }),
  eventType: z.string().optional(),
  file: FileMetadataSchema.optional(),
});

type EventStepData = z.infer<typeof EventStepSchema>;

interface EventStepProps {
  data?: Partial<OnboardingFormData>;
  onSubmit: (data: EventStepData) => void;
  onPrevious: () => void;
  isLoading?: boolean;
}

export function EventStep({
  data,
  onSubmit,
  onPrevious,
  isLoading,
}: EventStepProps) {
  const [uploadingFiles, setUploadingFiles] = React.useState<
    Map<File, FileMetadata>
  >(new Map());
  // Track all files currently in the FileUpload component (uploading and uploaded)
  const [currentUploadFiles, setCurrentUploadFiles] = React.useState<File[]>(
    [],
  );
  // Track upload errors per file
  const [uploadErrors, setUploadErrors] = React.useState<Map<File, string>>(
    new Map(),
  );
  const supabase = createClient();

  const form = useForm<EventStepData>({
    resolver: zodResolver(EventStepSchema),
    defaultValues: {
      eventDate: data?.eventDate ? new Date(data.eventDate) : undefined,
      eventType: data?.eventType || '',
      file: data?.file || undefined,
    },
  });

  // Update form when data prop changes
  React.useEffect(() => {
    if (data) {
      form.reset({
        eventDate: data.eventDate ? new Date(data.eventDate) : undefined,
        eventType: data.eventType || '',
        file: data.file || undefined,
      });
    }
  }, [data, form]);

  const handleFileUpload = React.useCallback(
    async (
      files: File[],
      callbacks: {
        onProgress: (file: File, progress: number) => void;
        onSuccess: (file: File) => void;
        onError: (file: File, error: Error) => void;
      },
    ) => {
      try {
        // Get current user for file naming
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error('User not authenticated');
        }

        // Upload each file
        for (const file of files) {
          try {
            // Validate CSV file content before uploading
            const isCSV =
              file.type === 'text/csv' || file.name.endsWith('.csv');

            if (isCSV) {
              callbacks.onProgress(file, 5);

              const validation = await validateCSVFile(file);

              if (!validation.isValid) {
                console.log('validation', validation);
                throw new Error(
                  validation.error || 'CSV file validation failed',
                );
              }
            }

            // Generate unique filename using UUID
            const fileExtension = file.name.split('.').pop() || '';
            const uniqueFileName = `${crypto.randomUUID()}.${fileExtension}`;
            const filePath = `${user.id}/${uniqueFileName}`;

            // Simulate initial progress (Supabase doesn't provide progress callbacks)
            callbacks.onProgress(file, 10);

            // Upload to Supabase storage
            const { error: uploadError } = await supabase.storage
              .from('guests')
              .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false,
              });

            if (uploadError) {
              throw uploadError;
            }

            callbacks.onProgress(file, 100);

            // Create file metadata object
            const fileMetadata: FileMetadata = {
              path: filePath,
              originalName: file.name,
              size: file.size,
              mimeType: file.type,
              uploadedAt: new Date().toISOString(),
            };

            // Update form field with file metadata
            form.setValue('file', fileMetadata);
            setUploadingFiles((prev) => {
              const next = new Map(prev);
              next.set(file, fileMetadata);
              return next;
            });

            // Clear any previous errors for this file on successful upload
            setUploadErrors((prev) => {
              const next = new Map(prev);
              next.delete(file);
              return next;
            });

            // callbacks.onProgress(file, 100);

            callbacks.onSuccess(file);
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : 'Failed to upload file';

            const errorToPass =
              error instanceof Error ? error : new Error(errorMessage);

            // Store error in state
            setUploadErrors((prev) => {
              const next = new Map(prev);
              next.set(file, errorMessage);
              return next;
            });

            callbacks.onError(file, errorToPass);
          }
        }
      } catch (error) {
        // Handle overall error
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to upload file';

        for (const file of files) {
          const errorToPass =
            error instanceof Error ? error : new Error(errorMessage);

          // Store error in state
          setUploadErrors((prev) => {
            const next = new Map(prev);
            next.set(file, errorMessage);
            return next;
          });

          callbacks.onError(file, errorToPass);
        }
      }
    },
    [supabase, form],
  );

  const handleSubmit = (values: EventStepData) => {
    onSubmit(values);
  };

  return (
    <div className="w-full">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="eventType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>What you celebrate?</FormLabel>
                <FormControl>
                  <ToggleGroup
                    type="single"
                    value={field.value || ''}
                    onValueChange={(value) => {
                      field.onChange(value || '');
                    }}
                    spacing={1}
                    disabled={isLoading}
                    variant="outline"
                    size="lg"
                    className="w-full grid grid-cols-3 gap-4"
                  >
                    <ToggleGroupItem
                      value="option1"
                      aria-label="Wedding"
                      className="h-14 text-base w-full rounded-md border"
                    >
                      Wedding
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="option2"
                      aria-label="Brit Mila"
                      className="h-14 text-base w-full rounded-md border"
                    >
                      Brit Mila
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="option3"
                      aria-label="Birthday"
                      className="h-14 text-base w-full rounded-md border"
                    >
                      Birthday
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="option4"
                      aria-label="Bar/Bat Mitzvah"
                      className="h-14 text-base w-full rounded-md border"
                    >
                      Bar/Bat Mitzvah
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="option5"
                      aria-label="Other"
                      className="h-14 text-base w-full rounded-md border"
                    >
                      Other
                    </ToggleGroupItem>
                  </ToggleGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="eventDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Event Date</FormLabel>
                <FormControl>
                  <DatePicker
                    date={field.value}
                    onDateChange={field.onChange}
                    placeholder="Select event date"
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="file"
            render={({ field }) => {
              // Show existing file info if metadata exists but no File object (from DB)
              // This happens when the file was previously uploaded and saved to DB
              const existingFileInfo =
                field.value &&
                !currentUploadFiles.some(
                  (file) =>
                    uploadingFiles.get(file)?.path === field.value?.path,
                )
                  ? field.value
                  : null;

              return (
                <FormItem>
                  <FormLabel>Upload File (Optional)</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <FileUpload
                        value={currentUploadFiles}
                        onValueChange={(files) => {
                          // Update the tracked files - this includes files that are still uploading
                          setCurrentUploadFiles(files);

                          // When file is removed, clean up metadata and errors
                          if (files.length === 0) {
                            field.onChange(undefined);
                            setUploadingFiles((prev) => {
                              const next = new Map(prev);
                              for (const [file] of prev.entries()) {
                                next.delete(file);
                              }
                              return next;
                            });
                            setUploadErrors(new Map());
                          } else {
                            // Clean up metadata and errors for files that are no longer in the list
                            setUploadingFiles((prev) => {
                              const next = new Map(prev);
                              const currentFilePaths = new Set(
                                files
                                  .map((f) => prev.get(f)?.path)
                                  .filter(Boolean),
                              );

                              // Remove metadata for files that are no longer present
                              for (const [file, metadata] of prev.entries()) {
                                if (
                                  !files.includes(file) &&
                                  !currentFilePaths.has(metadata.path)
                                ) {
                                  next.delete(file);
                                }
                              }

                              return next;
                            });

                            // Clean up errors for files that are no longer in the list
                            setUploadErrors((prev) => {
                              const next = new Map(prev);
                              for (const file of prev.keys()) {
                                if (!files.includes(file)) {
                                  next.delete(file);
                                }
                              }
                              return next;
                            });
                          }
                        }}
                        onUpload={handleFileUpload}
                        onFileValidate={(file) => {
                          // Basic file type validation (synchronous)
                          const isCSV =
                            file.type === 'text/csv' ||
                            file.name.endsWith('.csv');

                          if (!isCSV) {
                            return 'Only CSV files are allowed';
                          }
                          return null; // File type is valid, content validation happens in upload
                        }}
                        accept=".csv,text/csv"
                        maxFiles={1}
                        maxSize={10 * 1024 * 1024} // 10MB
                        disabled={isLoading}
                        className="w-full"
                      >
                        <FileUploadDropzone>
                          <div className="flex flex-col items-center justify-center gap-2 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <p className="text-sm font-medium">
                                Click to upload or drag and drop
                              </p>
                              <p className="text-xs text-muted-foreground">
                                CSV file (max 10MB)
                              </p>
                            </div>
                          </div>
                        </FileUploadDropzone>
                        <FileUploadList className="mt-4">
                          {currentUploadFiles.map((file, index) => (
                            <FileUploadItem
                              key={`${file.name}-${file.size}-${index}`}
                              value={file}
                            >
                              <FileUploadItemPreview
                                className="bg-white border-0 size-8"
                                render={() => <FileSpreadsheet />}
                              />
                              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                                <FileUploadItemMetadata>
                                  <span className="truncate font-medium text-sm">
                                    {file.name}
                                  </span>
                                  <span className="truncate text-muted-foreground text-xs">
                                    {(file.size / 1024).toFixed(2)} KB
                                  </span>
                                  {uploadErrors.get(file) && (
                                    <span className="text-destructive text-xs">
                                      {uploadErrors.get(file)}
                                    </span>
                                  )}
                                </FileUploadItemMetadata>
                              </div>
                              <FileUploadItemDelete asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="ml-auto h-8 w-8"
                                  onClick={() => {
                                    // Clean up metadata and errors when file is deleted
                                    const fileMetadata =
                                      uploadingFiles.get(file);
                                    if (
                                      fileMetadata?.path === field.value?.path
                                    ) {
                                      field.onChange(undefined);
                                    }
                                    setUploadingFiles((prev) => {
                                      const next = new Map(prev);
                                      next.delete(file);
                                      return next;
                                    });
                                    setUploadErrors((prev) => {
                                      const next = new Map(prev);
                                      next.delete(file);
                                      return next;
                                    });
                                  }}
                                >
                                  <XIcon className="h-4 w-4" />
                                  <span className="sr-only">Remove file</span>
                                </Button>
                              </FileUploadItemDelete>
                            </FileUploadItem>
                          ))}
                        </FileUploadList>
                      </FileUpload>
                      {existingFileInfo && (
                        <div className="text-sm text-muted-foreground p-2 border rounded">
                          Previously uploaded: {existingFileInfo.originalName} (
                          {(existingFileInfo.size / 1024).toFixed(2)} KB)
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={onPrevious}
              className="flex-1"
              disabled={isLoading}
            >
              Previous
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? (
                <BouncingBallIcon className="mr-2" size={16} />
              ) : (
                'Continue'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
