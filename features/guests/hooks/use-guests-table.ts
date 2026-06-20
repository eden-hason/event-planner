'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { GuestWithGroupApp, GroupSide } from '@/features/guests/schemas';
import { createGuestColumns } from '@/features/guests/components/table';
import { GuestSortKey } from './use-guest-filters';

const RSVP_ORDER: Record<string, number> = {
  confirmed: 0,
  pending: 1,
  declined: 2,
};

const DEFAULT_PAGE_SIZE = 10;

interface UseGuestsTableProps {
  guests: GuestWithGroupApp[];
  searchTerm: string;
  groupFilter: string[];
  statusFilter: string[];
  sideFilter: GroupSide[];
  noPhoneOnly: boolean;
  sortKey?: GuestSortKey;
  onDeleteGuest: (guest: GuestWithGroupApp) => void;
  pageSize?: number;
  showDietary?: boolean;
}

export function useGuestsTable({
  guests,
  searchTerm,
  groupFilter,
  statusFilter,
  sideFilter,
  noPhoneOnly,
  sortKey = 'created_asc',
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

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [sideFilter, noPhoneOnly]);

  const filteredGuests = useMemo(() => {
    const filtered = guests.filter((guest) => {
      if (
        sideFilter.length > 0 &&
        (!guest.side || !sideFilter.includes(guest.side))
      ) {
        return false;
      }
      if (noPhoneOnly && guest.phone) {
        return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      let primary = 0;
      switch (sortKey) {
        case 'name_asc':
          primary = a.name.localeCompare(b.name);
          break;
        case 'name_desc':
          primary = b.name.localeCompare(a.name);
          break;
        case 'created_asc':
          primary = 0; // DB already returns in created_at ASC, id ASC order
          break;
        case 'created_desc':
          primary = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          break;
        case 'rsvp':
          primary = (RSVP_ORDER[a.rsvpStatus] ?? 99) - (RSVP_ORDER[b.rsvpStatus] ?? 99);
          break;
        case 'amount_desc':
          primary = (b.amount ?? 0) - (a.amount ?? 0);
          break;
      }
      return primary !== 0 ? primary : a.id.localeCompare(b.id);
    });
  }, [guests, sideFilter, noPhoneOnly, sortKey]);

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
    data: filteredGuests,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn,
    autoResetPageIndex: false,
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
