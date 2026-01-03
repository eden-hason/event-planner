'use client';

import { type ParsedCSV } from '@/lib/utils/parse-csv';

interface MapStepProps {
  parsedData: ParsedCSV | null;
}

export function MapStep({ parsedData }: MapStepProps) {
  if (!parsedData) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-muted-foreground">No data to display</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm">
        <p className="font-medium">File parsed successfully</p>
        <p className="text-muted-foreground">
          Found {parsedData.headers.length} columns and {parsedData.rows.length}{' '}
          rows
        </p>
      </div>

      <div className="bg-muted/50 rounded-lg border p-4">
        <p className="text-muted-foreground mb-2 text-xs font-medium uppercase">
          Detected columns
        </p>
        <div className="flex flex-wrap gap-2">
          {parsedData.headers.map((header, index) => (
            <span
              key={index}
              className="bg-background rounded-md border px-2 py-1 text-sm"
            >
              {header}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

