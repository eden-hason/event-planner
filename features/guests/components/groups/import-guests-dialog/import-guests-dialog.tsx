'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Stepper,
  StepperItem,
  StepperIndicator,
  StepperTitle,
  StepperTrigger,
  StepperList,
  StepperContent,
} from '@/components/ui/stepper';
import { UploadStep } from './upload-step';
import { MapStep } from './map-step';
import { parseCSVFile, type ParsedCSV } from '@/lib/utils/parse-csv';

const STEPS = [
  { value: 'upload', title: 'Upload' },
  { value: 'map', title: 'Map' },
  { value: 'validate', title: 'Validate' },
  { value: 'summary', title: 'Summary' },
] as const;

type StepValue = (typeof STEPS)[number]['value'];

interface ImportGuestsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
}

export function ImportGuestsDialog({
  open,
  onOpenChange,
}: ImportGuestsDialogProps) {
  const [currentStep, setCurrentStep] = useState<StepValue>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [parsedData, setParsedData] = useState<ParsedCSV | null>(null);

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      setCurrentStep('upload');
      setFiles([]);
      setParsedData(null);
    }
  };

  const handleFilesChange = async (newFiles: File[]) => {
    setFiles(newFiles);

    if (newFiles.length > 0) {
      try {
        const parsed = await parseCSVFile(newFiles[0]);
        setParsedData(parsed);
        setCurrentStep('map');
      } catch (error) {
        toast.error('Failed to parse CSV file', {
          description:
            error instanceof Error ? error.message : 'Unknown error occurred',
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Guests from CSV</DialogTitle>
        </DialogHeader>

        <Stepper
          value={currentStep}
          onValueChange={(value) => setCurrentStep(value as StepValue)}
          className="w-full"
        >
          <StepperList className="justify-center gap-8">
            {STEPS.map((step) => (
              <StepperItem key={step.value} value={step.value} className="flex-none">
                <StepperTrigger className="flex-col gap-2">
                  <StepperIndicator />
                  <StepperTitle>{step.title}</StepperTitle>
                </StepperTrigger>
              </StepperItem>
            ))}
          </StepperList>

          <StepperContent value="upload" className="mt-4">
            <UploadStep files={files} onFilesChange={handleFilesChange} />
          </StepperContent>

          <StepperContent value="map" className="mt-4">
            <MapStep parsedData={parsedData} />
          </StepperContent>
        </Stepper>
      </DialogContent>
    </Dialog>
  );
}

