'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { IconSparkles } from '@tabler/icons-react';
import { PulseRingIcon } from '@/components/icons/svg-spinners-pulse-ring';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  analyzeCsv,
  type AnalyzeCsvResult,
} from '@/features/guests/actions/analyze-csv';
import { type ParsedCSV } from '@/features/guests/utils/parse-csv';
import { type ColumnMapping, type KululuFieldValue } from './map-step';

const AI_FIELD_TO_KULULU: Record<string, KululuFieldValue> = {
  full_name: 'name',
  phone: 'phone',
  amount: 'amount',
};

const FIELD_LABELS: Record<string, string> = {
  full_name: 'Name',
  phone: 'Phone',
  amount: 'Amount',
};

const STATUS_LINES = [
  (rowCount: number) => `File parsed — ${rowCount} rows detected`,
  () => 'Reading column headers…',
  () => 'Analyzing sample data…',
  () => 'Mapping to guest schema…',
];

export function AnalyzeLoadingPreview({
  rowCount,
  currentLine,
}: {
  rowCount: number;
  currentLine: number;
}) {
  return (
    <div className="flex flex-col items-center gap-6 pt-8 text-center">
      <div className="relative flex items-center justify-center">
        <PulseRingIcon size={140} className="absolute text-pink-400" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-rose-500 shadow-lg shadow-pink-300/50 dark:shadow-pink-900/50">
          <IconSparkles className="h-8 w-8 text-white" stroke={1.5} />
        </div>
      </div>

      {/* Text */}
      <div className="space-y-1.5">
        <p className="mt-4 text-xl font-bold tracking-tight">
          Analyzing your file…
        </p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Our AI is reading your columns and mapping
          <br />
          your guest data automatically
        </p>
      </div>

      {/* Log box */}
      <div className="bg-muted/40 w-full rounded-xl border px-5 py-4 text-left">
        <div className="space-y-2 font-mono text-sm">
          {STATUS_LINES.map((getLine, i) => {
            const done = i < currentLine;
            const active = i === currentLine;
            if (i > currentLine) return null;
            return (
              <div key={i} className="flex items-start gap-2.5">
                <span className="mt-px shrink-0 text-base leading-none">
                  {done ? '✓' : '⌛'}
                </span>
                <span
                  className={cn(
                    done && 'text-emerald-600 dark:text-emerald-400',
                    active && 'text-foreground font-semibold',
                  )}
                >
                  {getLine(rowCount)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function convertAiMappingToColumnMapping(
  aiMapping: Record<string, string>,
  headers: string[],
): ColumnMapping {
  const result: ColumnMapping = {};
  for (const [header, aiField] of Object.entries(aiMapping)) {
    const colIndex = headers.findIndex((h) => h === header);
    const kuluField = AI_FIELD_TO_KULULU[aiField];
    if (colIndex !== -1 && kuluField) {
      result[colIndex] = kuluField;
    }
  }
  return result;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

interface AnalyzeStepProps {
  parsedData: ParsedCSV | null;
  onColumnMappingChange: (mapping: ColumnMapping) => void;
}

export function AnalyzeStep({
  parsedData,
  onColumnMappingChange,
}: AnalyzeStepProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<AnalyzeCsvResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentLine, setCurrentLine] = useState(0);
  const hasRun = useRef(false);
  const rowCount = parsedData?.rows.length ?? 0;

  const runAnalysis = async () => {
    if (!parsedData) return;

    setStatus('loading');
    setResult(null);
    setErrorMessage(null);
    setCurrentLine(0);

    const csvText = [
      parsedData.headers.join(','),
      ...parsedData.rows.slice(0, 20).map((row) => row.join(',')),
    ].join('\n');
    const state = await analyzeCsv(csvText.slice(0, 3000));

    if (state.success && state.result) {
      setResult(state.result);
      setStatus('success');
      const mapping = convertAiMappingToColumnMapping(
        state.result.mapping,
        parsedData.headers,
      );
      onColumnMappingChange(mapping);
    } else {
      setErrorMessage(state.message ?? 'Analysis failed.');
      setStatus('error');
    }
  };

  // Auto-trigger on mount (Strict Mode safe)
  useEffect(() => {
    if (hasRun.current || !parsedData) return;
    hasRun.current = true;
    runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedData]);

  // Advance status lines one by one during loading
  useEffect(() => {
    if (status !== 'loading') return;
    const interval = setInterval(() => {
      setCurrentLine((prev) => {
        if (prev >= STATUS_LINES.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 900);
    return () => clearInterval(interval);
  }, [status]);

  if (!parsedData) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-muted-foreground">No data to display</p>
      </div>
    );
  }

  if (status === 'idle' || status === 'loading') {
    return (
      <AnalyzeLoadingPreview rowCount={rowCount} currentLine={currentLine} />
    );
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 text-center">
        <AlertCircle className="text-destructive h-8 w-8" />
        <div>
          <p className="font-medium">Analysis failed</p>
          <p className="text-muted-foreground text-sm">{errorMessage}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            hasRun.current = false;
            runAnalysis();
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  // success
  const mappedLabels =
    result?.preview.map((r) => FIELD_LABELS[r.field] ?? r.field) ?? [];

  return (
    <div className="flex flex-col items-center gap-6 py-4 text-center">
      {/* Check icon */}
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
        <CheckCircle2 className="h-10 w-10 text-green-500 dark:text-green-400" />
      </div>

      {/* Text */}
      <div className="space-y-1.5">
        <p className="text-xl font-bold tracking-tight">Mapping Complete</p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Our AI has successfully mapped your guest data to the
          <br />
          correct fields. Everything looks good to go!
        </p>
      </div>

      {/* Log box */}
      <div className="bg-muted/40 w-full rounded-xl border px-5 py-4 text-left">
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="mt-px h-4 w-4 shrink-0 text-green-500 dark:text-green-400" />
            <span>
              File parsed —{' '}
              <span className="font-bold">
                {parsedData?.rows.length ?? 0} rows
              </span>{' '}
              detected
            </span>
          </div>
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="mt-px h-4 w-4 shrink-0 text-green-500 dark:text-green-400" />
            <span className="flex flex-wrap items-center gap-1">
              Columns identified:
              {mappedLabels.map((label) => (
                <span
                  key={label}
                  className="bg-muted rounded px-1.5 py-0.5 text-xs font-medium"
                >
                  {label}
                </span>
              ))}
            </span>
          </div>
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="mt-px h-4 w-4 shrink-0 text-green-500 dark:text-green-400" />
            <span>Mapping to guest schema complete</span>
          </div>

          {result && result.warnings.length > 0 && (
            <div className="border-t pt-1 text-yellow-600 dark:text-yellow-400">
              {result.warnings.map((w, i) => (
                <p key={i}>{w}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
