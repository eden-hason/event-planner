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
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Button } from '@/components/ui/button';
import { IconUsers } from '@tabler/icons-react';
import { Upload, PlusIcon } from 'lucide-react';
import { GuestApp } from '@/features/guests/schemas';
import { useGuestsTable } from '@/features/guests/hooks';

interface GuestsTableProps {
  guests: GuestApp[];
  searchTerm: string;
  groupFilter: string[];
  onSelectGuest: (id: string) => void;
  onDeleteGuest: (guest: GuestApp) => void;
  onSendWhatsApp: (guest: GuestApp) => void;
  isSendingWhatsApp: boolean;
  onAddGuest?: () => void;
  onUploadFile?: () => void;
}

export function GuestsTable({
  guests,
  searchTerm,
  groupFilter,
  onSelectGuest,
  onDeleteGuest,
  onSendWhatsApp,
  isSendingWhatsApp,
  onAddGuest,
  onUploadFile,
}: GuestsTableProps) {
  const table = useGuestsTable({
    guests,
    searchTerm,
    groupFilter,
    onDeleteGuest,
    onSendWhatsApp,
    isSendingWhatsApp,
  });

  const handleRowClick = (guest: GuestApp) => {
    onSelectGuest(guest.id);
  };

  const tableRows = table.getFilteredRowModel().rows;
  const hasFilters = searchTerm || groupFilter.length > 0;
  const isEmpty = guests.length === 0;

  // Show empty state only when there are no guests and no filters applied
  if (isEmpty && !hasFilters) {
    return (
      <div className="rounded-md border">
        <Empty className="min-h-[400px]">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconUsers className="text-muted-foreground size-6" />
            </EmptyMedia>
            <EmptyTitle>No Guests Yet</EmptyTitle>
            <EmptyDescription>
              Get started by uploading a guest list or adding guests manually.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex gap-2">
              <Button onClick={onUploadFile}>
                <Upload className="size-4" />
                Upload File
              </Button>
              <Button variant="outline" onClick={onAddGuest}>
                <PlusIcon className="size-4" />
                Add Guest
              </Button>
            </div>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

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
                colSpan={table.getAllColumns().length}
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
                className="group cursor-pointer transition-colors hover:bg-gray-50"
                onClick={() => handleRowClick(row.original)}
              >
                {row.getVisibleCells().map((cell) => {
                  // Special handling for name column to match original styling
                  const isNameColumn = cell.column.id === 'name';
                  return (
                    <TableCell
                      key={cell.id}
                      className={
                        isNameColumn ? 'px-4 py-4 font-medium' : 'py-4'
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
