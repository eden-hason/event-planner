'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
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
  groupFilter: string[];
  statusFilter: string[];
  onDeleteGuest: (guest: GuestWithGroupApp) => void;
  pageSize?: number;
  showDietary?: boolean;
}

export function useGuestsTable({
  guests,
  searchTerm,
  groupFilter,
  statusFilter,
  onDeleteGuest,
  pageSize = DEFAULT_PAGE_SIZE,
  showDietary = false,
}: UseGuestsTableProps) {
  const t = useTranslations('guests');

  const dietaryLabelMap: Record<string, string> = {
    vegan: t('dietary.vegan'),
    vegetarian: t('dietary.vegetarian'),
    glatt: t('dietary.glatt'),
    'gluten-free': t('dietary.glutenFree'),
  };

  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });

  useEffect(() => {
    setPagination((prev) => {
      if (prev.pageSize === pageSize) return prev;
      const firstVisibleRow = prev.pageIndex * prev.pageSize;
      const newPageIndex = Math.floor(firstVisibleRow / pageSize);
      return { pageIndex: newPageIndex, pageSize };
    });
  }, [pageSize]);

  useEffect(() => {
    setGlobalFilter(searchTerm);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [searchTerm]);

  useEffect(() => {
    if (groupFilter.length === 0) {
      setColumnFilters((prev) => prev.filter((f) => f.id !== 'group'));
    } else {
      setColumnFilters((prev) => {
        const filtered = prev.filter((f) => f.id !== 'group');
        return [...filtered, { id: 'group', value: groupFilter }];
      });
    }
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [groupFilter]);

  useEffect(() => {
    if (statusFilter.length === 0) {
      setColumnFilters((prev) => prev.filter((f) => f.id !== 'rsvpStatus'));
    } else {
      setColumnFilters((prev) => {
        const filtered = prev.filter((f) => f.id !== 'rsvpStatus');
        return [...filtered, { id: 'rsvpStatus', value: statusFilter }];
      });
    }
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [statusFilter]);

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
    showDietary,
    t,
    dietaryLabelMap,
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
