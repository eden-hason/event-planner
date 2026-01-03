'use client';

import { TableBody, TableCell, TableHead } from '@/components/ui/table';
import { getSampleData, type ParsedCSV } from '@/lib/utils/parse-csv';
import { Table, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Available Kululu fields for mapping
export const KULULU_FIELDS = [
  { value: 'name', label: 'Name' },
  { value: 'phone', label: 'Phone' },
] as const;

export type KululuFieldValue = (typeof KULULU_FIELDS)[number]['value'];

// Mapping state: CSV column index -> Kululu field value (or null if not mapped)
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
  if (!parsedData) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-muted-foreground">No data to display</p>
      </div>
    );
  }

  // Get all currently selected field values (excluding the current column)
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

  // Count mapped fields
  const mappedFieldsCount = new Set(
    Object.values(columnMapping).filter(Boolean),
  ).size;
  const totalFieldsRequired = KULULU_FIELDS.length;
  const isAllMapped = mappedFieldsCount === totalFieldsRequired;

  return (
    <div className="space-y-4">
      <div className="text-sm">
        <p className="font-medium">Map your columns</p>
        <p className="text-muted-foreground">
          Match the columns from <span className="font-bold">{fileName}</span>{' '}
          to Kululu fields
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>CSV Header</TableHead>
              <TableHead>Sample Data</TableHead>
              <TableHead>Kululu Field</TableHead>
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
                        handleMappingChange(
                          index,
                          value as KululuFieldValue | 'skip',
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Kululu Field" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skip">Don&apos;t import</SelectItem>
                        {KULULU_FIELDS.map((field) => (
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
          <span className="font-medium">
            {mappedFieldsCount}/{totalFieldsRequired}
          </span>{' '}
          {isAllMapped
            ? 'All required fields mapped ✓'
            : 'required fields mapped'}
        </div>
      </div>
    </div>
  );
}
