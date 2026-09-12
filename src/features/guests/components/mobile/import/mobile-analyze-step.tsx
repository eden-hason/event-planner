'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { IconAlertCircle } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  analyzeCsv,
  type AnalyzeCsvResult,
} from '@/features/guests/actions/analyze-csv';
import { type ParsedCSV } from '@/features/guests/utils/parse-csv';
import {
  type ColumnMapping,
  type KululuFieldValue,
} from '@/features/guests/utils/import-guests';

function fileExtLabel(file: File): string {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx')) return 'XLSX';
  if (name.endsWith('.xls')) return 'XLS';
  return 'CSV';
}

const AI_FIELD_TO_KULULU: Record<string, KululuFieldValue> = {
  full_name: 'name',
  phone: 'phone',
  amount: 'amount',
  side: 'side',
  group: 'group',
};

// Display order for the five field rows - independent of whatever order the
// model happened to return its preview entries in.
const FIELD_ORDER: Array<{ aiField: string; labelKey: string }> = [
  { aiField: 'full_name', labelKey: 'fieldName' },
  { aiField: 'phone', labelKey: 'fieldPhone' },
  { aiField: 'amount', labelKey: 'fieldAmount' },
  { aiField: 'side', labelKey: 'fieldSide' },
  { aiField: 'group', labelKey: 'fieldGroup' },
];

function buildColumnMapping(
  preview: AnalyzeCsvResult['preview'],
  headers: string[],
): ColumnMapping {
  const result: ColumnMapping = {};
  for (const item of preview) {
    const kuluField = AI_FIELD_TO_KULULU[item.field];
    if (
      kuluField &&
      Number.isInteger(item.columnIndex) &&
      item.columnIndex >= 0 &&
      item.columnIndex < headers.length
    ) {
      result[item.columnIndex] = kuluField;
    }
  }
  return result;
}

type Status = 'loading' | 'success' | 'error';

interface MobileAnalyzeStepProps {
  file: File;
  parsedData: ParsedCSV;
  onComplete: (params: {
    mapping: ColumnMapping;
    needsReview: boolean;
    preview: AnalyzeCsvResult['preview'];
  }) => void;
}

export function MobileAnalyzeStep({
  file,
  parsedData,
  onComplete,
}: MobileAnalyzeStepProps) {
  const t = useTranslations('guests.import');
  const tm = useTranslations('guests.import.mobile.analyze');
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tickIndex, setTickIndex] = useState(0);
  const [preview, setPreview] = useState<AnalyzeCsvResult['preview']>([]);
  const hasRun = useRef(false);

  const runAnalysis = async () => {
    setStatus('loading');
    setErrorMessage(null);
    setTickIndex(0);
    setPreview([]);

    const state = await analyzeCsv({
      headers: parsedData.headers,
      sampleRows: parsedData.rows.slice(0, 20),
    });

    if (state.success && state.result) {
      setPreview(state.result.preview);
      setStatus('success');
      onComplete({
        mapping: buildColumnMapping(state.result.preview, parsedData.headers),
        needsReview: state.result.needsReview,
        preview: state.result.preview,
      });
    } else {
      setErrorMessage(state.message ?? t('analyze.failedHeading'));
      setStatus('error');
    }
  };

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Purely cosmetic progress while the request is in flight - the model
  // resolves all five fields in one round trip, so this doesn't track real
  // per-field progress. It resolves to the actual result the moment the
  // response lands, whatever tick it was on.
  useEffect(() => {
    if (status !== 'loading') return;
    const interval = setInterval(() => {
      setTickIndex((prev) => Math.min(prev + 1, FIELD_ORDER.length - 1));
    }, 700);
    return () => clearInterval(interval);
  }, [status]);

  if (status === 'error') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <IconAlertCircle className="text-destructive size-8" />
        <div>
          <p className="font-semibold">{t('analyze.failedHeading')}</p>
          <p className="text-muted-foreground text-sm">{errorMessage}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            hasRun.current = false;
            runAnalysis();
          }}
        >
          {t('analyze.tryAgain')}
        </Button>
      </div>
    );
  }

  const previewByField = new Map(preview.map((p) => [p.field, p]));

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-4">
      <div className="flex w-full items-center gap-3 rounded-xl border p-3">
        <span className="bg-success/15 text-success flex size-10 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold">
          {fileExtLabel(file)}
        </span>
        <div className="min-w-0 flex-1 text-start">
          <p className="truncate text-sm font-semibold">{file.name}</p>
          <p className="text-muted-foreground text-xs">
            {tm('fileMeta', {
              rows: parsedData.rows.length,
              columns: parsedData.headers.length,
            })}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center gap-5 pt-4 text-center">
        <span className="border-primary/15 border-t-primary size-14 shrink-0 animate-spin rounded-full border-4" />
        <div className="flex flex-col gap-1">
          <p className="text-lg font-bold">{tm('identifyingColumns')}</p>
        </div>

      <div className="bg-muted/40 flex w-full flex-col gap-1.5 rounded-xl border p-3">
        {FIELD_ORDER.map(({ aiField, labelKey }, i) => {
          const resolved = status === 'success';
          const matched = previewByField.get(aiField);
          const revealed = resolved || i <= tickIndex;
          const done = resolved ? Boolean(matched) : i < tickIndex;
          const busy = !resolved && i === tickIndex;

          return (
            <div
              key={aiField}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors',
                done && 'bg-success/10',
              )}
            >
              <span
                className={cn(
                  'flex size-[22px] shrink-0 items-center justify-center rounded-full text-xs',
                  done
                    ? 'bg-success text-success-foreground'
                    : busy
                      ? 'bg-primary/15 text-primary'
                      : 'bg-border text-muted-foreground',
                )}
              >
                {done ? '✓' : busy ? '…' : ''}
              </span>
              <span className="w-24 shrink-0 text-start text-sm font-semibold">
                {t(
                  `map.${labelKey}` as
                    | 'map.fieldName'
                    | 'map.fieldPhone'
                    | 'map.fieldAmount'
                    | 'map.fieldSide'
                    | 'map.fieldGroup',
                )}
              </span>
              <span
                dir="ltr"
                className="text-muted-foreground min-w-0 flex-1 truncate font-mono text-xs"
              >
                {revealed
                  ? resolved
                    ? (parsedData.headers[matched?.columnIndex ?? -1] ?? '-')
                    : '…'
                  : ''}
              </span>
            </div>
          );
        })}
      </div>
        <span className="text-muted-foreground text-xs">{tm('usuallyFast')}</span>
      </div>
    </div>
  );
}
