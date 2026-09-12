'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useRouter } from '@/i18n/navigation';
import {
  importGuests,
  type ImportGuestsState,
} from '@/features/guests/actions';
import type { AnalyzeCsvResult } from '@/features/guests/actions/analyze-csv';
import { parseCSVFile, type ParsedCSV } from '@/features/guests/utils/parse-csv';
import { pickGoogleDriveFile } from '@/features/guests/utils/google-drive-picker';
import type { ImportGuestData, GroupApp } from '@/features/guests/schemas';
import { type ColumnMapping } from '@/features/guests/utils/import-guests';
import { ImportWizardShell } from './import-wizard-shell';
import { MobileUploadStep } from './mobile-upload-step';
import { MobileAnalyzeStep } from './mobile-analyze-step';
import { MobileMappingReviewStep } from './mobile-mapping-review-step';
import { MobileValidateStep } from './mobile-validate-step';
import { MobileSummaryStep, type SkipReason } from './mobile-summary-step';
import { computeMergedRows, type RowEditsMap } from './compute-import-rows';

type FlowStep = 'upload' | 'analyzing' | 'review' | 'validate' | 'summary';

interface GuestImportFlowProps {
  eventId: string;
  existingPhones: Map<string, string>;
  groups: GroupApp[];
}

function stepIndexFor(step: FlowStep): number {
  if (step === 'upload') return 0;
  if (step === 'analyzing' || step === 'review') return 1;
  if (step === 'validate') return 2;
  return 3;
}

/**
 * The mobile guest-import wizard's state machine: upload -> analyze ->
 * (mapping review, only when the AI wasn't confident) -> validate -> summary.
 *
 * Lives at `/guests/import` as its own full-screen route rather than inside
 * the desktop `Dialog` this replaces on mobile - see `ImportWizardShell` and
 * `isGuestImportRoute` for why. Desktop keeps the dialog untouched; nothing
 * here is shared with it beyond the underlying parse/validate/import
 * utilities and server actions.
 */
export function GuestImportFlow({
  eventId,
  existingPhones,
  groups,
}: GuestImportFlowProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('guests.import');
  const tu = useTranslations('guests.import.mobile.upload');
  const ts = useTranslations('guests.import.mobile.summary');

  const [step, setStep] = useState<FlowStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedCSV | null>(null);
  const [isConnectingToDrive, setIsConnectingToDrive] = useState(false);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [analyzePreview, setAnalyzePreview] = useState<
    AnalyzeCsvResult['preview']
  >([]);
  const [excludedRows, setExcludedRows] = useState<Set<number>>(new Set());
  const [rowEdits, setRowEdits] = useState<RowEditsMap>(new Map());

  const [importStatus, setImportStatus] = useState<
    'importing' | 'success' | 'error'
  >('importing');
  const [importResult, setImportResult] = useState<ImportGuestsState | null>(
    null,
  );
  const [skipReasons, setSkipReasons] = useState<SkipReason[]>([]);

  const goToGuestList = () => router.push(`/app/${eventId}/guests`);

  const resetToUpload = () => {
    setSelectedFile(null);
    setParsedData(null);
    setColumnMapping({});
    setAnalyzePreview([]);
    setExcludedRows(new Set());
    setRowEdits(new Map());
    setImportResult(null);
    setIsConnectingToDrive(false);
    setStep('upload');
  };

  const handleBack = () => {
    if (step === 'upload') {
      goToGuestList();
      return;
    }
    if (step === 'analyzing' || step === 'review') {
      resetToUpload();
      return;
    }
    if (step === 'validate') {
      resetToUpload();
      return;
    }
    // From summary, back behaves like "import another file" rather than
    // stepping into a finished import - there's nothing to resume there.
    resetToUpload();
  };

  // Shared by both sources - a device upload and a Drive download both end up
  // as a plain `File` by the time this runs, so parsing and advancing to the
  // analyze step doesn't care which one it came from.
  const processFile = async (file: File) => {
    try {
      const parsed = await parseCSVFile(file);
      if (parsed.rows.length === 0) {
        toast.error(t('parseFailed'), { description: t('parseFailedUnknown') });
        return;
      }
      setSelectedFile(file);
      setParsedData(parsed);
      setColumnMapping({});
      setExcludedRows(new Set());
      setRowEdits(new Map());
      setStep('analyzing');
    } catch (error) {
      toast.error(t('parseFailed'), {
        description: error instanceof Error ? error.message : t('parseFailedUnknown'),
      });
    }
  };

  const handleGoogleDriveImport = async () => {
    setIsConnectingToDrive(true);
    try {
      const file = await pickGoogleDriveFile();
      // `null` means the user closed the picker without choosing anything -
      // not an error, so no toast.
      if (file) await processFile(file);
    } catch (error) {
      console.error('Google Drive import failed:', error);
      toast.error(tu('driveFailed'));
    } finally {
      setIsConnectingToDrive(false);
    }
  };

  // `?source=drive` (from the source sheet's Drive row) opens straight into
  // the picker instead of landing on the plain upload screen.
  const hasAutoTriggeredDrive = useRef(false);
  useEffect(() => {
    if (hasAutoTriggeredDrive.current) return;
    if (searchParams.get('source') !== 'drive') return;
    hasAutoTriggeredDrive.current = true;
    handleGoogleDriveImport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleAnalyzeComplete = ({
    mapping,
    needsReview,
    preview,
  }: {
    mapping: ColumnMapping;
    needsReview: boolean;
    preview: AnalyzeCsvResult['preview'];
  }) => {
    setColumnMapping(mapping);
    setAnalyzePreview(preview);
    setStep(needsReview ? 'review' : 'validate');
  };

  const handleImport = async () => {
    if (!parsedData) return;

    const merged = computeMergedRows(
      parsedData.rows,
      columnMapping,
      existingPhones,
      rowEdits,
      excludedRows,
    );
    const active = merged.filter((r) => !excludedRows.has(r.rowIndex));
    const invalid = active.filter((r) => !r.isValid);
    const guestsToImport = active
      .filter((r) => r.isValid)
      .map((r) => r.data as ImportGuestData);

    // Snapshotted here, before the request - these are rows the client
    // filtered out and never sent, so only the client can explain why. The
    // server's own `skippedCount` (a rare concurrent-import race) is a
    // separate, much smaller number surfaced through `importResult` instead.
    //
    // Every skipped row lands in exactly one bucket below (checked in this
    // priority order), so the buckets always sum to `skippedCount` on the
    // summary screen - including rows the user removed by hand and rows
    // invalid for a reason none of the named buckets covers (e.g. amount or
    // group), which used to disappear from the breakdown entirely.
    let missingName = 0;
    let invalidPhone = 0;
    let phoneExists = 0;
    let phoneDuplicateCsv = 0;
    let other = 0;
    for (const row of invalid) {
      if (row.fieldErrors.name) missingName++;
      else if (row.fieldErrors.phone === 'import.validate.errors.phoneInvalid') invalidPhone++;
      else if (row.fieldErrors.phone === 'import.validate.errors.phoneExists') phoneExists++;
      else if (row.fieldErrors.phone === 'import.validate.errors.phoneDuplicateCsv')
        phoneDuplicateCsv++;
      else other++;
    }

    setSkipReasons([
      { key: 'missingName', label: ts('reasonMissingName'), count: missingName },
      { key: 'invalidPhone', label: ts('reasonInvalidPhone'), count: invalidPhone },
      { key: 'phoneExists', label: ts('reasonPhoneExists'), count: phoneExists },
      { key: 'phoneDuplicateCsv', label: ts('reasonPhoneDuplicateCsv'), count: phoneDuplicateCsv },
      { key: 'removedByUser', label: ts('reasonRemovedByUser'), count: excludedRows.size },
      { key: 'other', label: ts('reasonOther'), count: other },
    ]);

    setStep('summary');
    setImportStatus('importing');
    setImportResult(null);

    const result = await importGuests(eventId, guestsToImport);
    setImportResult(result);
    setImportStatus(result.success ? 'success' : 'error');
  };

  return (
    <ImportWizardShell stepIndex={stepIndexFor(step)} onBack={handleBack}>
      {step === 'upload' && (
        <MobileUploadStep
          onFileSelected={processFile}
          onError={(message) => toast.error(message)}
          onSelectGoogleDrive={handleGoogleDriveImport}
          isConnectingToDrive={isConnectingToDrive}
        />
      )}

      {step === 'analyzing' && parsedData && selectedFile && (
        <MobileAnalyzeStep
          file={selectedFile}
          parsedData={parsedData}
          onComplete={handleAnalyzeComplete}
        />
      )}

      {step === 'review' && parsedData && (
        <MobileMappingReviewStep
          parsedData={parsedData}
          mapping={columnMapping}
          onMappingChange={setColumnMapping}
          preview={analyzePreview}
          onConfirm={() => setStep('validate')}
        />
      )}

      {step === 'validate' && parsedData && (
        <MobileValidateStep
          parsedData={parsedData}
          columnMapping={columnMapping}
          existingPhones={existingPhones}
          groups={groups}
          excludedRows={excludedRows}
          onExcludedRowsChange={setExcludedRows}
          rowEdits={rowEdits}
          onRowEditsChange={setRowEdits}
          onImport={handleImport}
        />
      )}

      {step === 'summary' && (
        <MobileSummaryStep
          status={importStatus}
          result={importResult}
          totalFileRows={parsedData?.rows.length ?? 0}
          reasons={skipReasons}
          onGoToGuestList={goToGuestList}
          onImportAnother={resetToUpload}
        />
      )}
    </ImportWizardShell>
  );
}
