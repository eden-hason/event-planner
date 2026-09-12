'use client';

import { useTranslations } from 'next-intl';
import { IconAlertTriangle } from '@tabler/icons-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getSampleData, type ParsedCSV } from '@/features/guests/utils/parse-csv';
import {
  KULULU_FIELDS,
  type ColumnMapping,
  type KululuFieldValue,
} from '@/features/guests/utils/import-guests';
import type { AnalyzeCsvResult } from '@/features/guests/actions/analyze-csv';

const KULULU_TO_AI_FIELD: Record<KululuFieldValue, string> = {
  name: 'full_name',
  phone: 'phone',
  amount: 'amount',
  side: 'side',
  group: 'group',
};

const NONE = '__none__';

function columnForField(
  mapping: ColumnMapping,
  field: KululuFieldValue,
): number | null {
  for (const [indexStr, value] of Object.entries(mapping)) {
    if (value === field) return Number(indexStr);
  }
  return null;
}

interface MobileMappingReviewStepProps {
  parsedData: ParsedCSV;
  mapping: ColumnMapping;
  onMappingChange: (mapping: ColumnMapping) => void;
  preview: AnalyzeCsvResult['preview'];
  onConfirm: () => void;
}

/**
 * Shown only when `analyzeCsv` flagged low confidence on a field, or left the
 * required name field unmapped - see `AnalyzeCsvResult.needsReview`. Without
 * this escape hatch, an unmapped name column used to leave the desktop
 * wizard's Next button disabled with nowhere to go (`map-step.tsx` exists but
 * nothing renders it).
 *
 * Draws one card per Kululu field with a column dropdown - the artboard's
 * field-to-column direction - while `ColumnMapping` underneath stays
 * column-to-field so every other consumer (desktop's map-step, the
 * validation utils) is untouched. Picking a column another field already
 * owns transfers it: the field being edited takes the column, and whichever
 * field used to hold it silently reverts to unmapped - visible immediately
 * because that field's own dropdown updates too.
 */
export function MobileMappingReviewStep({
  parsedData,
  mapping,
  onMappingChange,
  preview,
  onConfirm,
}: MobileMappingReviewStepProps) {
  const t = useTranslations('guests.import');
  const tm = useTranslations('guests.import.mobile.review');

  const previewByAiField = new Map(preview.map((p) => [p.field, p]));
  const lowConfidenceCount = KULULU_FIELDS.filter((f) => {
    const p = previewByAiField.get(KULULU_TO_AI_FIELD[f.value]);
    return p && p.confidence === 'low';
  }).length;

  const nameMapped = columnForField(mapping, 'name') !== null;

  const handleChange = (field: KululuFieldValue, value: string) => {
    const next = { ...mapping };
    const oldColumn = columnForField(mapping, field);
    if (oldColumn !== null) delete next[oldColumn];
    if (value !== NONE) {
      next[Number(value)] = field;
    }
    onMappingChange(next);
  };

  return (
    <div className="flex h-full flex-col">
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
      <div className="bg-warning/10 border-warning/30 flex items-start gap-2.5 rounded-xl border p-3">
        <span className="bg-warning text-background flex size-[22px] shrink-0 items-center justify-center rounded-full">
          <IconAlertTriangle size={13} />
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="text-warning text-sm font-semibold">
            {lowConfidenceCount === 1
              ? tm('bannerTitleOne')
              : tm('bannerTitleOther', { count: lowConfidenceCount })}
          </span>
          <span className="text-warning/90 text-xs leading-relaxed">
            {tm('bannerDescription', {
              mapped: KULULU_FIELDS.length - lowConfidenceCount,
              total: KULULU_FIELDS.length,
            })}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {KULULU_FIELDS.map((field) => {
          const p = previewByAiField.get(KULULU_TO_AI_FIELD[field.value]);
          const columnIndex = columnForField(mapping, field.value);
          const low = p?.confidence === 'low';
          const sample =
            columnIndex !== null
              ? getSampleData(parsedData.rows, columnIndex)
              : '';

          return (
            <div
              key={field.value}
              className={cn(
                'flex flex-col gap-2 rounded-xl border bg-card p-3.5',
                low && 'border-warning/50',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">
                  {t(
                    `map.field${field.value.charAt(0).toUpperCase()}${field.value.slice(1)}` as
                      | 'map.fieldName'
                      | 'map.fieldPhone'
                      | 'map.fieldAmount'
                      | 'map.fieldSide'
                      | 'map.fieldGroup',
                  )}
                  {field.required && (
                    <span className="text-destructive"> *</span>
                  )}
                </span>
                {p && (
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                      low
                        ? 'bg-warning/15 text-warning'
                        : 'bg-success/15 text-success',
                    )}
                  >
                    {low ? tm('confidenceLow') : tm('confidenceHigh')}
                  </span>
                )}
              </div>
              <Select
                value={columnIndex !== null ? String(columnIndex) : NONE}
                onValueChange={(value) => handleChange(field.value, value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('map.selectField')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>{t('map.dontImport')}</SelectItem>
                  {parsedData.headers.map((header, index) => (
                    <SelectItem key={index} value={String(index)}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sample && (
                <span className="text-muted-foreground truncate text-xs">
                  {tm('samplesLabel', { samples: sample })}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>

      <div className="bg-card shrink-0 border-t p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <Button onClick={onConfirm} disabled={!nameMapped} className="w-full">
          {tm('confirm')}
        </Button>
      </div>
    </div>
  );
}
