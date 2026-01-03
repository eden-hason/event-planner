'use client';

import { useMemo } from 'react';
import { CircleCheck, CircleX, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { type ParsedCSV } from '@/lib/utils/parse-csv';
import { type ColumnMapping } from './map-step';
import { validateCsvRows } from '@/features/guests/utils';

interface ValidateStepProps {
  parsedData: ParsedCSV | null;
  columnMapping: ColumnMapping;
  excludedRows: Set<number>;
  onExcludedRowsChange: (excludedRows: Set<number>) => void;
  existingPhones: Set<string>;
}

export function ValidateStep({
  parsedData,
  columnMapping,
  excludedRows,
  onExcludedRowsChange,
  existingPhones,
}: ValidateStepProps) {
  // Validate all rows
  const validatedRows = useMemo(() => {
    if (!parsedData) return [];

    return validateCsvRows(parsedData.rows, columnMapping, existingPhones);
  }, [parsedData, columnMapping, existingPhones]);

  // Filter out excluded rows for display
  const displayRows = validatedRows.filter(
    (row) => !excludedRows.has(row.rowIndex),
  );

  // Count stats
  const validCount = displayRows.filter((r) => r.isValid).length;
  const invalidCount = displayRows.filter((r) => !r.isValid).length;
  const totalCount = displayRows.length;

  const handleRemoveRow = (rowIndex: number) => {
    const newExcluded = new Set(excludedRows);
    newExcluded.add(rowIndex);
    onExcludedRowsChange(newExcluded);
  };

  if (!parsedData) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-muted-foreground">No data to validate</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm">
        <p className="font-medium">Validate your data</p>
        <p className="text-muted-foreground">
          Review the data below. Invalid rows can be removed before importing.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <div className="max-h-[300px] overflow-y-auto">
          <Table>
            <TableHeader className="bg-muted sticky top-0">
              <TableRow>
                <TableHead className="w-[60px]">Status</TableHead>
                <TableHead className="w-[60px]">Row</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Errors</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-muted/50">
              {displayRows.map((row) => (
                <TableRow
                  key={row.rowIndex}
                  className={row.isValid ? '' : 'bg-red-50 dark:bg-red-950/30'}
                >
                  <TableCell className="p-3">
                    {row.isValid ? (
                      <CircleCheck className="h-5 w-5 text-green-600" />
                    ) : (
                      <CircleX className="h-5 w-5 text-red-600" />
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground p-3">
                    {row.rowIndex + 1}
                  </TableCell>
                  <TableCell className="max-w-[120px] truncate p-3">
                    {row.data.name || '—'}
                  </TableCell>
                  <TableCell className="max-w-[120px] truncate p-3">
                    {row.data.phone || '—'}
                  </TableCell>
                  <TableCell className="max-w-[150px] p-3">
                    {row.errors.length > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="block truncate text-sm text-red-600">
                            {row.errors.join(', ')}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[300px]">
                          <ul className="list-disc space-y-1 pl-4 text-sm">
                            {row.errors.map((error, i) => (
                              <li key={i}>{error}</li>
                            ))}
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell className="p-3">
                    {!row.isValid && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground h-8 w-8 hover:text-red-600"
                        onClick={() => handleRemoveRow(row.rowIndex)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Footer with stats */}
        <div
          className={`border-t px-4 py-3 text-sm ${
            invalidCount === 0
              ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400'
              : 'bg-muted/50 text-muted-foreground'
          }`}
        >
          <span className="font-medium">{validCount}</span> valid,{' '}
          <span className={invalidCount > 0 ? 'font-medium text-red-600' : ''}>
            {invalidCount}
          </span>{' '}
          invalid out of <span className="font-medium">{totalCount}</span> rows
          {invalidCount === 0 && ' ✓'}
        </div>
      </div>
    </div>
  );
}
