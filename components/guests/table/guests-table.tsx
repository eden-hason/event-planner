'use client';

import { flexRender } from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { GuestApp } from '@/lib/schemas/guest.schema';
import { useGuestsTable } from '@/hooks/guests';
import { guestColumns } from './columns';

interface GuestsTableProps {
  guests: GuestApp[];
  searchTerm: string;
  groupFilter: string[];
  onSelectGuest: (id: string) => void;
}

export function GuestsTable({
  guests,
  searchTerm,
  groupFilter,
  onSelectGuest,
}: GuestsTableProps) {
  const table = useGuestsTable({ guests, searchTerm, groupFilter });

  const handleRowClick = (guest: GuestApp) => {
    onSelectGuest(guest.id);
  };

  const tableRows = table.getFilteredRowModel().rows;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {tableRows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={guestColumns.length}
                className="h-24 text-center"
              >
                <div className="p-8 text-center text-gray-500">
                  {searchTerm
                    ? 'No guests found matching your search.'
                    : 'No guests found.'}
                </div>
              </TableCell>
            </TableRow>
          ) : (
            tableRows.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer hover:bg-gray-50 transition-colors group"
                onClick={() => handleRowClick(row.original)}
              >
                {row.getVisibleCells().map((cell) => {
                  // Special handling for name column to match original styling
                  const isNameColumn = cell.column.id === 'name';
                  return (
                    <TableCell
                      key={cell.id}
                      className={
                        isNameColumn ? 'font-medium py-4 px-4' : 'py-4'
                      }
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
