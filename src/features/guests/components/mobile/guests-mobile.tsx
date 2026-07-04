'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconFilter2,
  IconPlus,
  IconUpload,
  IconUsers,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { GuestWithGroupApp, GroupInfo } from '@/features/guests/schemas';
import { useGuestFilters } from '@/features/guests/hooks';
import { filterAndSortGuests } from '@/features/guests/utils';
import { GuestSearch } from '@/features/guests/components/guest-search';
import { GuestMeterChips } from './guest-meter-chips';
import { GuestMobileCard } from './guest-mobile-card';
import { GuestFiltersSheet } from './guest-filters-sheet';
import { cn } from '@/lib/utils';

const MOBILE_PAGE_SIZE = 12;

interface GuestsMobileProps {
  guests: GuestWithGroupApp[];
  groups: GroupInfo[];
  onSelectGuest: (guest: GuestWithGroupApp | null) => void;
  onDeleteGuest: (guest: GuestWithGroupApp) => void;
  onMarkConfirmed: (guest: GuestWithGroupApp) => void;
  onUploadFile: () => void;
  selectedStatuses: string[];
  onStatusClick: (status: string | null) => void;
}

export function GuestsMobile({
  guests,
  groups,
  onSelectGuest,
  onDeleteGuest,
  onMarkConfirmed,
  onUploadFile,
  selectedStatuses,
  onStatusClick,
}: GuestsMobileProps) {
  const t = useTranslations('guests');
  const isRTL = useLocale() === 'he';

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);

  const {
    searchTerm,
    setSearchTerm,
    selectedGroupIds,
    handleGroupToggle,
    selectedSides,
    handleSideToggle,
    noPhoneOnly,
    toggleNoPhoneOnly,
    sortKey,
    setSortKey,
  } = useGuestFilters(groups);

  const filteredGuests = useMemo(
    () =>
      filterAndSortGuests(guests, {
        searchTerm,
        groupIds: selectedGroupIds,
        statuses: selectedStatuses,
        sides: selectedSides,
        noPhoneOnly,
        sortKey,
      }),
    [guests, searchTerm, selectedGroupIds, selectedStatuses, selectedSides, noPhoneOnly, sortKey],
  );

  // Reset to first page whenever the filtered result set changes.
  useEffect(() => {
    setPageIndex(0);
  }, [searchTerm, selectedGroupIds, selectedStatuses, selectedSides, noPhoneOnly, sortKey]);

  const total = filteredGuests.length;
  const pageCount = Math.max(1, Math.ceil(total / MOBILE_PAGE_SIZE));
  const safePageIndex = Math.min(pageIndex, pageCount - 1);
  const start = safePageIndex * MOBILE_PAGE_SIZE;
  const pageRows = filteredGuests.slice(start, start + MOBILE_PAGE_SIZE);

  const activeFilterCount =
    selectedGroupIds.length +
    selectedSides.length +
    (noPhoneOnly ? 1 : 0) +
    (sortKey !== 'created_asc' ? 1 : 0);

  const handleClearAll = () => {
    selectedGroupIds.forEach((id) => handleGroupToggle(id));
    selectedSides.forEach((side) => handleSideToggle(side));
    if (noPhoneOnly) toggleNoPhoneOnly();
    setSortKey('created_asc');
    onStatusClick(null);
  };

  // First use: no guests at all.
  if (guests.length === 0) {
    return (
      <Empty className="min-h-[400px]">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconUsers className="text-muted-foreground size-6" />
          </EmptyMedia>
          <EmptyTitle>{t('table.emptyTitle')}</EmptyTitle>
          <EmptyDescription>{t('table.emptyDescription')}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="flex gap-2">
            <Button onClick={onUploadFile}>
              <IconUpload size={16} />
              {t('table.uploadFile')}
            </Button>
            <Button variant="outline" onClick={() => onSelectGuest(null)}>
              <IconPlus size={16} />
              {t('table.addGuest')}
            </Button>
          </div>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Sticky utility cluster: meter + chips + search + filters */}
      <div className="flex flex-col gap-3 pb-2 pt-1">
        <GuestMeterChips
          guests={guests}
          selectedStatuses={selectedStatuses}
          onStatusClick={onStatusClick}
        />
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <GuestSearch
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              className="bg-white"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className={cn(
              'relative shrink-0',
              activeFilterCount > 0 && 'border-primary/50 bg-primary/8 text-primary',
            )}
            onClick={() => setFiltersOpen(true)}
            aria-label={t('filters.title')}
          >
            <IconFilter2 size={18} />
            {activeFilterCount > 0 && (
              <span className="bg-primary text-primary-foreground absolute -top-1.5 -end-1.5 flex size-4 items-center justify-center rounded-full text-[10px] font-semibold">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Card list */}
      {total === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-muted-foreground text-sm">
            {searchTerm ? t('table.noGuestsSearch') : t('table.noGuestsFound')}
          </p>
          <Button variant="outline" size="sm" onClick={handleClearAll}>
            {t('filters.clearAll')}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {pageRows.map((guest) => (
            <GuestMobileCard
              key={guest.id}
              guest={guest}
              onSelect={onSelectGuest}
              onDelete={onDeleteGuest}
              onMarkConfirmed={onMarkConfirmed}
              t={t}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 0 && (
        <div className="flex flex-col items-center gap-2 pt-2">
          <p className="text-muted-foreground text-sm">
            {t('table.showing', {
              start: start + 1,
              end: Math.min(start + MOBILE_PAGE_SIZE, total),
              total,
            })}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setPageIndex(0)}
              disabled={safePageIndex === 0}
            >
              {isRTL ? <IconChevronsRight size={16} /> : <IconChevronsLeft size={16} />}
              <span className="sr-only">{t('table.firstPage')}</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              disabled={safePageIndex === 0}
            >
              {isRTL ? <IconChevronRight size={16} /> : <IconChevronLeft size={16} />}
              <span className="sr-only">{t('table.previousPage')}</span>
            </Button>
            <span className="px-2 text-sm font-medium">
              {safePageIndex + 1} / {pageCount}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))}
              disabled={safePageIndex >= pageCount - 1}
            >
              {isRTL ? <IconChevronLeft size={16} /> : <IconChevronRight size={16} />}
              <span className="sr-only">{t('table.nextPage')}</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setPageIndex(pageCount - 1)}
              disabled={safePageIndex >= pageCount - 1}
            >
              {isRTL ? <IconChevronsLeft size={16} /> : <IconChevronsRight size={16} />}
              <span className="sr-only">{t('table.lastPage')}</span>
            </Button>
          </div>
        </div>
      )}

      <GuestFiltersSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        groups={groups}
        selectedGroupIds={selectedGroupIds}
        onGroupToggle={handleGroupToggle}
        selectedSides={selectedSides}
        onSideToggle={handleSideToggle}
        noPhoneOnly={noPhoneOnly}
        onToggleNoPhone={toggleNoPhoneOnly}
        sortKey={sortKey}
        onSortChange={setSortKey}
        onClearAll={handleClearAll}
      />
    </div>
  );
}
