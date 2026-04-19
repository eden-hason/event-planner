'use client';

import { useTranslations } from 'next-intl';
import { TableBody, TableCell, TableHead } from '@/components/ui/table';
import { getSampleData, type ParsedCSV } from '@/features/guests/utils/parse-csv';
import { Table, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const KULULU_FIELDS = [
  { value: 'name', required: true },
  { value: 'phone', required: true },
  { value: 'amount', required: false },
] as const;

export type KululuFieldValue = (typeof KULULU_FIELDS)[number]['value'];
export type ColumnMapping = Record<number, KululuFieldValue | null>;

interface MapStepProps {
  parsedData: ParsedCSV | null;
  fileName: string;
  columnMapping: ColumnMapping;
  onColumnMappingChange: (mapping: ColumnMapping) => void;
}

export function MapStep({
  parsedData,
  fileName,
  columnMapping,
  onColumnMappingChange,
}: MapStepProps) {
  const t = useTranslations('guests');

  const kululuFields = KULULU_FIELDS.map((f) => ({
    ...f,
    label: t(`import.map.field${f.value.charAt(0).toUpperCase() + f.value.slice(1)}` as
      'import.map.fieldName' | 'import.map.fieldPhone' | 'import.map.fieldAmount'),
  }));

  if (!parsedData) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-muted-foreground">No data to display</p>
      </div>
    );
  }

  const getSelectedFields = (excludeIndex: number): Set<KululuFieldValue> => {
    const selected = new Set<KululuFieldValue>();
    Object.entries(columnMapping).forEach(([index, value]) => {
      if (Number(index) !== excludeIndex && value) {
        selected.add(value);
      }
    });
    return selected;
  };

  const handleMappingChange = (
    columnIndex: number,
    value: KululuFieldValue | 'skip',
  ) => {
    onColumnMappingChange({
      ...columnMapping,
      [columnIndex]: value === 'skip' ? null : value,
    });
  };

  const mappedFieldsCount = new Set(
    Object.values(columnMapping).filter(Boolean),
  ).size;
  const requiredFields = kululuFields.filter((f) => f.required);
  const mappedRequiredCount = requiredFields.filter((f) =>
    Object.values(columnMapping).includes(f.value),
  ).length;
  const totalFieldsRequired = requiredFields.length;
  const isAllMapped = mappedRequiredCount === totalFieldsRequired;

  return (
    <div className="space-y-4">
      <div className="text-sm">
        <p className="font-medium">{t('import.map.heading')}</p>
        <p className="text-muted-foreground">
          {t('import.map.description', { fileName })}
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>{t('import.map.csvHeader')}</TableHead>
              <TableHead>{t('import.map.sampleData')}</TableHead>
              <TableHead>{t('import.map.kululuField')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-muted/50">
            {parsedData.headers.map((header, index) => {
              const selectedFields = getSelectedFields(index);
              const currentValue = columnMapping[index];

              return (
                <TableRow key={index}>
                  <TableCell className="p-4">{header}</TableCell>
                  <TableCell className="p-4">
                    {getSampleData(parsedData.rows, index)}
                  </TableCell>
                  <TableCell className="p-4">
                    <Select
                      value={currentValue ?? 'skip'}
                      onValueChange={(value) =>
                        handleMappingChange(index, value as KululuFieldValue | 'skip')
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('import.map.selectField')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skip">{t('import.map.dontImport')}</SelectItem>
                        {kululuFields.map((field) => (
                          <SelectItem
                            key={field.value}
                            value={field.value}
                            disabled={selectedFields.has(field.value)}
                          >
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <div
          className={`border-t px-4 py-3 text-sm ${
            isAllMapped
              ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400'
              : 'bg-muted/50 text-muted-foreground'
          }`}
        >
          {isAllMapped
            ? t('import.map.allMapped')
            : t('import.map.mappedCount', {
                mapped: mappedRequiredCount,
                total: totalFieldsRequired,
              })}
          {mappedFieldsCount > mappedRequiredCount && (
            <span className="text-muted-foreground ml-2">
              {t('import.map.optional', { count: mappedFieldsCount - mappedRequiredCount })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
