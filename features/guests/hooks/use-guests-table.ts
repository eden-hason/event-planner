'use client';

import { useState, useEffect } from 'react';
import {
  ColumnFiltersState,
  Row,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { GuestWithGroupApp } from '@/features/guests/schemas';
import { createGuestColumns } from '@/features/guests/components/table';

interface UseGuestsTableProps {
  guests: GuestWithGroupApp[];
  searchTerm: string;
  groupFilter: string[]; // Array of group IDs
  onDeleteGuest: (guest: GuestWithGroupApp) => void;
  onSendWhatsApp: (guest: GuestWithGroupApp) => void;
  isSendingWhatsApp: boolean;
}

export function useGuestsTable({
  guests,
  searchTerm,
  groupFilter,
  onDeleteGuest,
  onSendWhatsApp,
  isSendingWhatsApp,
}: UseGuestsTableProps) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // Update global filter when searchTerm changes
  useEffect(() => {
    setGlobalFilter(searchTerm);
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
    globalFilterFn,
    onColumnFiltersChange: setColumnFilters,
    state: {
      globalFilter,
      columnFilters,
    },
    onGlobalFilterChange: setGlobalFilter,
  });

  return table;
}
