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
import {
  Upload,
  PlusIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { GuestWithGroupApp } from '@/features/guests/schemas';
import { useGuestsTable } from '@/features/guests/hooks';

interface GuestsTableProps {
  guests: GuestWithGroupApp[];
  searchTerm: string;
  groupFilter: string[]; // Array of group IDs
  onSelectGuest: (id: string) => void;
  onDeleteGuest: (guest: GuestWithGroupApp) => void;
  onAddGuest?: () => void;
  onUploadFile?: () => void;
  pageSize?: number;
}

export function GuestsTable({
  guests,
  searchTerm,
  groupFilter,
  onSelectGuest,
  onDeleteGuest,
  onAddGuest,
  onUploadFile,
  pageSize,
}: GuestsTableProps) {
  const table = useGuestsTable({
    guests,
    searchTerm,
    groupFilter,
    onDeleteGuest,
    pageSize,
  });

  const handleRowClick = (guest: GuestWithGroupApp) => {
    onSelectGuest(guest.id);
  };

  // Use paginated rows for display, filtered rows for count
  const paginatedRows = table.getRowModel().rows;
  const totalFilteredRows = table.getFilteredRowModel().rows.length;
  const hasFilters = searchTerm || groupFilter.length > 0;
  const isEmpty = guests.length === 0;

  // Pagination info
  const { pageIndex, pageSize: currentPageSize } = table.getState().pagination;
  const pageCount = table.getPageCount();
  const startRow = pageIndex * currentPageSize + 1;
  const endRow = Math.min((pageIndex + 1) * currentPageSize, totalFilteredRows);

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
    <div className="flex flex-col gap-4">
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
            {paginatedRows.length === 0 ? (
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
              paginatedRows.map((row) => (
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
                          isNameColumn ? 'px-4 py-2 font-medium' : 'py-2'
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

      {/* Pagination Controls */}
      {totalFilteredRows > 0 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-muted-foreground text-sm">
            Showing {startRow}-{endRow} of {totalFilteredRows} guests
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className="size-4" />
              <span className="sr-only">First page</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="size-4" />
              <span className="sr-only">Previous page</span>
            </Button>
            <div className="flex items-center gap-1 px-2">
              <span className="text-sm font-medium">
                {pageIndex + 1} / {pageCount || 1}
              </span>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="size-4" />
              <span className="sr-only">Next page</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight className="size-4" />
              <span className="sr-only">Last page</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
