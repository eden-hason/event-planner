'use client';

import { useState, useMemo, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
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
import { AnalyzeStep } from './analyze-step';
import { KULULU_FIELDS, type ColumnMapping } from './map-step';
import { ValidateStep } from './validate-step';
import { SummaryStep } from './summary-step';
import { parseCSVFile, type ParsedCSV } from '@/features/guests/utils/parse-csv';
import { validateCsvRows } from '@/features/guests/utils';
import { type ImportGuestData } from '@/features/guests/schemas';

type StepKey = 'upload' | 'analyze' | 'validate' | 'summary';

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
  const t = useTranslations('guests');
  const locale = useLocale();

  const STEPS: { value: StepKey; title: string }[] = [
    { value: 'upload', title: t('import.stepUpload') },
    { value: 'analyze', title: t('import.stepAnalyze') },
    { value: 'validate', title: t('import.stepValidate') },
    { value: 'summary', title: t('import.stepSummary') },
  ];

  const [currentStep, setCurrentStep] = useState<StepKey>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [parsedData, setParsedData] = useState<ParsedCSV | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [excludedRows, setExcludedRows] = useState<Set<number>>(new Set());
  const [importComplete, setImportComplete] = useState(false);

  const validGuestsToImport = useMemo((): ImportGuestData[] => {
    if (!parsedData) return [];
    const validatedRows = validateCsvRows(parsedData.rows, columnMapping, existingPhones);
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
      toast.success(t('import.importSuccess'));
    }
  }, [t]);

  const handleFilesChange = async (newFiles: File[]) => {
    setFiles(newFiles);
    if (newFiles.length > 0) {
      try {
        const parsed = await parseCSVFile(newFiles[0]);
        setParsedData(parsed);
        setColumnMapping({});
      } catch (error) {
        toast.error('Failed to parse CSV file', {
          description:
            error instanceof Error ? error.message : 'Unknown error occurred',
        });
      }
    }
  };

  const isAllFieldsMapped = (): boolean => {
    const mappedValues = new Set(Object.values(columnMapping).filter(Boolean));
    const requiredFields = KULULU_FIELDS.filter((field) => field.required);
    return requiredFields.every((field) => mappedValues.has(field.value));
  };

  const currentStepIndex = STEPS.findIndex((s) => s.value === currentStep);

  const isNextDisabled = (): boolean => {
    if (currentStep === 'upload') return !parsedData;
    if (currentStep === 'analyze') return !isAllFieldsMapped();
    if (currentStep === 'validate') return validGuestsToImport.length === 0;
    return false;
  };

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
          <DialogTitle>{t('import.title')}</DialogTitle>
        </DialogHeader>

        <Stepper
          value={currentStep}
          onValueChange={(value) => setCurrentStep(value as StepKey)}
          className="w-full"
          nonInteractive
          dir={locale === 'he' ? 'rtl' : 'ltr'}
        >
          <StepperList className="justify-center gap-8 rounded-lg bg-muted/50 px-6 py-4">
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

          <StepperContent value="analyze" className="mt-4">
            <AnalyzeStep
              parsedData={parsedData}
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
              {importComplete ? t('import.done') : t('import.close')}
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={handlePrevious}
                disabled={currentStepIndex === 0}
              >
                {t('import.previous')}
              </Button>
              <Button onClick={handleNext} disabled={isNextDisabled()}>
                {currentStep === 'validate' ? t('import.import') : t('import.next')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
