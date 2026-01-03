'use client';

import { useState, useEffect } from 'react';
import {
  ColumnFiltersState,
  PaginationState,
  Row,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { GuestWithGroupApp } from '@/features/guests/schemas';
import { createGuestColumns } from '@/features/guests/components/table';

const DEFAULT_PAGE_SIZE = 10;

interface UseGuestsTableProps {
  guests: GuestWithGroupApp[];
  searchTerm: string;
  groupFilter: string[]; // Array of group IDs
  onDeleteGuest: (guest: GuestWithGroupApp) => void;
  onSendWhatsApp: (guest: GuestWithGroupApp) => void;
  isSendingWhatsApp: boolean;
  pageSize?: number;
}

export function useGuestsTable({
  guests,
  searchTerm,
  groupFilter,
  onDeleteGuest,
  onSendWhatsApp,
  isSendingWhatsApp,
  pageSize = DEFAULT_PAGE_SIZE,
}: UseGuestsTableProps) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });

  // Update page size when it changes (e.g., from window resize)
  useEffect(() => {
    setPagination((prev) => {
      if (prev.pageSize === pageSize) return prev;
      // Calculate new page index to keep roughly the same position
      const firstVisibleRow = prev.pageIndex * prev.pageSize;
      const newPageIndex = Math.floor(firstVisibleRow / pageSize);
      return { pageIndex: newPageIndex, pageSize };
    });
  }, [pageSize]);

  // Update global filter when searchTerm changes
  useEffect(() => {
    setGlobalFilter(searchTerm);
    // Reset to first page when search changes
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [searchTerm]);

  // Update column filters when groupFilter changes
  useEffect(() => {
    if (groupFilter.length === 0) {
      setColumnFilters((prev) => prev.filter((f) => f.id !== 'group'));
    } else {
      setColumnFilters((prev) => {
        const filtered = prev.filter((f) => f.id !== 'group');
        return [...filtered, { id: 'group', value: groupFilter }];
      });
    }
    // Reset to first page when filters change
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [groupFilter]);

  // Custom global filter function for searching across multiple columns
  const globalFilterFn = (
    row: Row<GuestWithGroupApp>,
    _columnId: string,
    filterValue: string,
  ): boolean => {
    const searchLower = filterValue.toLowerCase();
    const guest = row.original;

    return (
      guest.name.toLowerCase().includes(searchLower) ||
      (guest.phone?.toLowerCase().includes(searchLower) ?? false) ||
      (guest.group?.name.toLowerCase().includes(searchLower) ?? false) ||
      (guest.notes?.toLowerCase().includes(searchLower) ?? false)
    );
  };

  const columns = createGuestColumns({
    onDelete: onDeleteGuest,
    onSendWhatsApp,
    isSendingWhatsApp,
  });

  const table = useReactTable({
    data: guests,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    state: {
      globalFilter,
      columnFilters,
      pagination,
    },
    onGlobalFilterChange: setGlobalFilter,
  });

  return table;
}
