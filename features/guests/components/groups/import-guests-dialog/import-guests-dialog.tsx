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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { validateCsvRows, validateGuestData, normalizePhone } from '@/features/guests/utils';
import { type ImportGuestData } from '@/features/guests/schemas';

type StepKey = 'upload' | 'analyze' | 'validate' | 'summary';

interface ImportGuestsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  existingPhones: Map<string, string>;
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
  const [rowEdits, setRowEdits] = useState<Map<number, Partial<{ name: string; phone: string; amount: number; side: 'bride' | 'groom' | null; group: string }>>>(new Map());
  const [importComplete, setImportComplete] = useState(false);
  const [showSkipInvalidAlert, setShowSkipInvalidAlert] = useState(false);

  const validGuestsToImport = useMemo((): ImportGuestData[] => {
    if (!parsedData) return [];
    const validatedRows = validateCsvRows(parsedData.rows, columnMapping, existingPhones);
    const activeRows = validatedRows.filter((row) => !excludedRows.has(row.rowIndex));

    // Build phone set for all active rows (using edits when available)
    const allActivePhones = new Set<string>(
      activeRows
        .map((row) => {
          const edits = rowEdits.get(row.rowIndex);
          return edits?.phone ?? row.data.phone ?? '';
        })
        .filter(Boolean)
        .map(normalizePhone),
    );

    // Always re-validate against the live merged phone set so that an edit on
    // row B that collides with unedited row A is caught (and vice versa).
    return activeRows.flatMap((row) => {
      const edits = rowEdits.get(row.rowIndex);
      const merged = edits ? { ...row.data, ...edits } : row.data;

      const otherPhones = new Set(allActivePhones);
      if (merged.phone) otherPhones.delete(normalizePhone(merged.phone));
      const { isValid } = validateGuestData(
        {
          name: merged.name,
          phone: merged.phone,
          amount: merged.amount,
          side: merged.side ?? undefined,
          group: merged.group,
        },
        existingPhones,
        otherPhones,
      );
      return isValid ? [merged as ImportGuestData] : [];
    });
  }, [parsedData, columnMapping, excludedRows, existingPhones, rowEdits]);

  const activeRowCount = useMemo(() => {
    if (!parsedData) return 0;
    const validatedRows = validateCsvRows(parsedData.rows, columnMapping, existingPhones);
    return validatedRows.filter((row) => !excludedRows.has(row.rowIndex)).length;
  }, [parsedData, columnMapping, excludedRows, existingPhones]);

  const invalidRowCount = Math.max(0, activeRowCount - validGuestsToImport.length);

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      setCurrentStep('upload');
      setFiles([]);
      setParsedData(null);
      setColumnMapping({});
      setExcludedRows(new Set());
      setRowEdits(new Map());
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

  const advanceStep = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentStepIndex + 1].value);
    }
  };

  const handleNext = () => {
    if (currentStep === 'validate' && invalidRowCount > 0) {
      setShowSkipInvalidAlert(true);
      return;
    }
    advanceStep();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-4xl">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{t('import.title')}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
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
              rowEdits={rowEdits}
              onRowEditsChange={setRowEdits}
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
        </div>

        <DialogFooter className="flex-shrink-0 bg-muted/50 -mx-6 mt-4 -mb-6 gap-2 rounded-b-lg px-6 py-4">
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
      <AlertDialog open={showSkipInvalidAlert} onOpenChange={setShowSkipInvalidAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('import.validate.skipInvalidTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('import.validate.skipInvalidDescription', { count: invalidRowCount })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('import.validate.skipInvalidCancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowSkipInvalidAlert(false);
                advanceStep();
              }}
            >
              {t('import.validate.skipInvalidConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
