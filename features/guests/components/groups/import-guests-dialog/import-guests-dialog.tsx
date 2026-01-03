'use client';

import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
import { MapStep, KULULU_FIELDS, type ColumnMapping } from './map-step';
import { ValidateStep } from './validate-step';
import { SummaryStep } from './summary-step';
import { parseCSVFile, type ParsedCSV } from '@/lib/utils/parse-csv';
import { validateCsvRows } from '@/features/guests/utils';
import { type ImportGuestData } from '@/features/guests/schemas';

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
  existingPhones: Set<string>;
}

export function ImportGuestsDialog({
  open,
  onOpenChange,
  eventId,
  existingPhones,
}: ImportGuestsDialogProps) {
  const [currentStep, setCurrentStep] = useState<StepValue>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [parsedData, setParsedData] = useState<ParsedCSV | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [excludedRows, setExcludedRows] = useState<Set<number>>(new Set());
  const [importComplete, setImportComplete] = useState(false);

  // Get valid guests to import (excluding removed rows and invalid rows)
  const validGuestsToImport = useMemo((): ImportGuestData[] => {
    if (!parsedData) return [];

    const validatedRows = validateCsvRows(
      parsedData.rows,
      columnMapping,
      existingPhones,
    );
    return validatedRows
      .filter((row) => row.isValid && !excludedRows.has(row.rowIndex))
      .map((row) => row.data as ImportGuestData);
  }, [parsedData, columnMapping, excludedRows, existingPhones]);

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      setCurrentStep('upload');
      setFiles([]);
      setParsedData(null);
      setColumnMapping({});
      setExcludedRows(new Set());
      setImportComplete(false);
    }
  };

  const handleImportComplete = useCallback((success: boolean) => {
    setImportComplete(true);
    if (success) {
      toast.success('Guests imported successfully!');
    }
  }, []);

  const handleFilesChange = async (newFiles: File[]) => {
    setFiles(newFiles);

    if (newFiles.length > 0) {
      try {
        const parsed = await parseCSVFile(newFiles[0]);
        setParsedData(parsed);
        setColumnMapping({}); // Reset mapping when new file is uploaded
        setCurrentStep('map');
      } catch (error) {
        toast.error('Failed to parse CSV file', {
          description:
            error instanceof Error ? error.message : 'Unknown error occurred',
        });
      }
    }
  };

  // Check if all required Kululu fields are mapped
  const isAllFieldsMapped = (): boolean => {
    const mappedValues = new Set(Object.values(columnMapping).filter(Boolean));
    return KULULU_FIELDS.every((field) => mappedValues.has(field.value));
  };

  // Get current step index
  const currentStepIndex = STEPS.findIndex((s) => s.value === currentStep);

  // Check if Next button should be disabled
  const isNextDisabled = (): boolean => {
    if (currentStep === 'upload') return true;
    if (currentStep === 'map') return !isAllFieldsMapped();
    if (currentStep === 'validate') return validGuestsToImport.length === 0;
    return false;
  };

  // Navigation handlers
  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(STEPS[currentStepIndex - 1].value);
    }
  };

  const handleNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentStepIndex + 1].value);
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
          nonInteractive
        >
          <StepperList className="justify-center gap-8 rounded-lg bg-muted/50 px-6 py-4">
            {STEPS.map((step) => (
              <StepperItem
                key={step.value}
                value={step.value}
                className="flex-none"
              >
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
            <MapStep
              parsedData={parsedData}
              fileName={files[0]?.name ?? ''}
              columnMapping={columnMapping}
              onColumnMappingChange={setColumnMapping}
            />
          </StepperContent>

          <StepperContent value="validate" className="mt-4">
            <ValidateStep
              parsedData={parsedData}
              columnMapping={columnMapping}
              excludedRows={excludedRows}
              onExcludedRowsChange={setExcludedRows}
              existingPhones={existingPhones}
            />
          </StepperContent>

          <StepperContent value="summary" className="mt-4">
            <SummaryStep
              eventId={eventId}
              guests={validGuestsToImport}
              onImportComplete={handleImportComplete}
            />
          </StepperContent>
        </Stepper>

        <DialogFooter className="bg-muted/50 -mx-6 mt-4 -mb-6 gap-2 rounded-b-lg px-6 py-4">
          {currentStep === 'summary' ? (
            <Button onClick={() => handleOpenChange(false)}>
              {importComplete ? 'Done' : 'Close'}
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={handlePrevious}
                disabled={currentStepIndex === 0}
              >
                Previous
              </Button>
              <Button onClick={handleNext} disabled={isNextDisabled()}>
                {currentStep === 'validate' ? 'Import' : 'Next'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
