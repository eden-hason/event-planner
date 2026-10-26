'use client';

import { useState, useRef, useCallback, useTransition, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { toast } from 'sonner';
import { Search, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { cn } from '@/lib/utils';
import {
  PAYMENT_METHODS,
  formatCurrency,
  isPaymentMethodKey,
  type GiftRow,
  type PaymentMethodKey,
} from '../types';
import { upsertGift, deleteGift } from '../actions/gifts';
import { buildGiftsSheetRows, toFileName } from '../utils/export-budget';
import {
  giftAmount,
  matchesGiftFilter,
  summarizeGifts,
  type GiftFilter,
  type GiftSummary,
} from '../utils/gift-summary';
import { DownloadSheetButton } from './download-sheet-button';
import { GiftsHero } from './gifts-hero';
import { GiftSheet, type GiftSheetEntry, type GiftSheetValues } from './gift-sheet';
import { PAYMENT_METHOD_BADGE } from './payment-method-styles';

interface LocalGiftEntry {
  rowId: string;
  guestId: string | null;
  guestName: string;
  giftId: string | null;
  amount: number | '';
  paymentMethod: string;
  notes: string;
}

type EditableField = 'guestName' | 'amount' | 'paymentMethod' | 'notes';

interface EditingCell {
  id: string;
  field: EditableField;
}

function toLocalEntry(row: GiftRow): LocalGiftEntry {
  return {
    rowId: row.guestId ?? row.giftId!,
    guestId: row.guestId,
    guestName: row.guestName,
    giftId: row.giftId,
    amount: row.amount ?? '',
    paymentMethod: row.paymentMethod ?? '',
    notes: row.notes ?? '',
  };
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

const FILTERS: GiftFilter[] = ['all', 'noAmount', 'noMethod'];

function filterCount(summary: GiftSummary, filter: GiftFilter) {
  if (filter === 'noAmount') return summary.missingAmountCount;
  if (filter === 'noMethod') return summary.missingMethodCount;
  return summary.rowCount;
}

/**
 * "All / no amount / no method" over the log. On the desktop table every chip
 * shows; the phone row only has room for the ones with something in them, so
 * it drops an empty chip unless it is the one selected.
 */
function FilterChips({
  summary,
  value,
  onChange,
  variant,
}: {
  summary: GiftSummary;
  value: GiftFilter;
  onChange: (filter: GiftFilter) => void;
  variant: 'table' | 'list';
}) {
  const t = useTranslations('budget.giftTable');
  const labels: Record<GiftFilter, string> = {
    all: t('filterAll'),
    noAmount: t('filterNoAmount'),
    noMethod: t('filterNoMethod'),
  };

  return (
    <>
      {FILTERS.map((filter) => {
        const count = filterCount(summary, filter);
        const active = value === filter;
        if (variant === 'list' && filter !== 'all' && count === 0 && !active) return null;
        return (
          <button
            key={filter}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(filter)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 border text-[13px] font-semibold whitespace-nowrap transition-colors',
              variant === 'table' ? 'h-8 rounded-[10px] px-3' : 'h-9 rounded-full px-3',
              active
                ? 'bg-foreground text-background border-foreground'
                : 'bg-card hover:bg-muted/50',
            )}
          >
            {labels[filter]}
            <span
              className={cn(
                'text-xs tabular-nums',
                active ? 'opacity-75' : 'text-muted-foreground font-medium',
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </>
  );
}

export function GiftsTab({
  eventId,
  eventName,
  initialGifts,
  addGiftOpen,
  onAddGiftOpenChange,
}: {
  eventId: string;
  eventName?: string;
  initialGifts: GiftRow[];
  /** The add-gift sheet, opened from the page header's button. */
  addGiftOpen: boolean;
  onAddGiftOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('budget');
  const locale = useLocale();
  const [gifts, setGifts] = useState<LocalGiftEntry[]>(() =>
    initialGifts.map(toLocalEntry),
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<GiftFilter>('all');
  const [methodFilter, setMethodFilter] = useState<PaymentMethodKey | null>(null);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [newGuestName, setNewGuestName] = useState('');
  // The row the phone list opened in the sheet. Kept after the sheet closes so
  // its title does not flip to "add" while it animates out.
  const [sheetRowId, setSheetRowId] = useState<string | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();
  const giftsRef = useRef(gifts);
  giftsRef.current = gifts;

  const summary = useMemo(() => summarizeGifts(gifts), [gifts]);
  const confirmedGuestCount = useMemo(() => gifts.filter((g) => g.guestId).length, [gifts]);

  /**
   * Saves a row the UI already shows, putting `previous` back if the save
   * fails (or dropping the row when there was none before).
   */
  const persistEntry = useCallback(
    async (entry: LocalGiftEntry, previous: LocalGiftEntry | null) => {
      const result = await upsertGift(eventId, {
        giftId: entry.giftId,
        guestId: entry.guestId,
        guestName: entry.guestName,
        amount: entry.amount === '' ? null : Number(entry.amount),
        paymentMethod: entry.paymentMethod || null,
        notes: entry.notes || null,
      });
      if (!result.success) {
        setGifts((prev) =>
          previous
            ? prev.map((g) => (g.rowId === entry.rowId ? previous : g))
            : prev.filter((g) => g.rowId !== entry.rowId),
        );
        return false;
      }
      if (result.giftId && !entry.giftId) {
        setGifts((prev) =>
          prev.map((g) =>
            g.rowId === entry.rowId ? { ...g, giftId: result.giftId } : g,
          ),
        );
      }
      return true;
    },
    [eventId],
  );

  const updateGift = useCallback(
    (rowId: string, field: EditableField, value: string | number) => {
      const current = giftsRef.current.find((g) => g.rowId === rowId);
      if (!current) return;

      const entry = { ...current, [field]: value };

      setGifts((prev) => prev.map((g) => (g.rowId === rowId ? entry : g)));

      startTransition(async () => {
        if (!(await persistEntry(entry, current))) {
          toast.error(t('toast.giftSaveFailed'));
        }
      });
    },
    [persistEntry, t],
  );

  /**
   * Clears a row's gift, putting it back if the server refuses. Resolves to
   * whether the delete held, for the caller to report.
   */
  const deleteRowGift = useCallback(async (rowId: string) => {
    const entry = giftsRef.current.find((g) => g.rowId === rowId);
    if (!entry) return true;
    // A confirmed guest stays on the list with nothing logged, so the counts
    // in the hero keep them; a gift added by hand goes with its row.
    if (entry.guestId) {
      setGifts((prev) =>
        prev.map((g) =>
          g.rowId === rowId ? { ...g, giftId: null, amount: '', paymentMethod: '', notes: '' } : g,
        ),
      );
    } else {
      setGifts((prev) => prev.filter((g) => g.rowId !== rowId));
    }
    if (!entry.giftId) return true;
    const result = await deleteGift(eventId, entry.giftId);
    if (!result.success) {
      setGifts((prev) =>
        entry.guestId
          ? prev.map((g) => (g.rowId === rowId ? entry : g))
          : [...prev, entry],
      );
    }
    return result.success;
  }, [eventId]);

  const handleDeleteGift = useCallback((rowId: string) => {
    startTransition(async () => {
      if (!(await deleteRowGift(rowId))) toast.error(t('toast.error'));
    });
  }, [deleteRowGift, t]);

  const handleAddRow = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter' || !newGuestName.trim()) return;
      const entry: LocalGiftEntry = {
        rowId: generateId(),
        guestId: null,
        guestName: newGuestName.trim(),
        giftId: null,
        amount: '',
        paymentMethod: '',
        notes: '',
      };
      setGifts((prev) => [...prev, entry]);
      setNewGuestName('');
    },
    [newGuestName],
  );

  // Confirmed guests still waiting on an amount - what someone adding a gift
  // by hand is most likely typing.
  const guestSuggestions = useMemo(
    () => gifts.filter((g) => g.guestId && giftAmount(g) === null).map((g) => g.guestName),
    [gifts],
  );

  const sheetEntry = useMemo<GiftSheetEntry | null>(() => {
    const row = sheetRowId ? gifts.find((g) => g.rowId === sheetRowId) : null;
    if (!row) return null;
    return {
      guestName: row.guestName,
      amount: row.amount,
      paymentMethod: isPaymentMethodKey(row.paymentMethod) ? row.paymentMethod : '',
      notes: row.notes,
      isGuest: row.guestId !== null,
    };
  }, [sheetRowId, gifts]);

  const sheetOpen = addGiftOpen || editSheetOpen;

  const handleSheetOpenChange = (open: boolean) => {
    if (open) return;
    if (addGiftOpen) {
      onAddGiftOpenChange(false);
      setSheetRowId(null);
    }
    setEditSheetOpen(false);
  };

  const openRowSheet = (rowId: string) => {
    setSheetRowId(rowId);
    setEditSheetOpen(true);
  };

  const handleSheetSave = async (values: GiftSheetValues) => {
    const editing = !addGiftOpen && sheetRowId
      ? giftsRef.current.find((g) => g.rowId === sheetRowId) ?? null
      : null;
    // A gift added under a confirmed guest's name lands on that guest's row
    // instead of starting a second one beside it.
    const target =
      editing ??
      giftsRef.current.find(
        (g) => g.guestId && giftAmount(g) === null && g.guestName.trim() === values.guestName,
      ) ??
      null;

    const entry: LocalGiftEntry = target
      ? {
          ...target,
          guestName: target.guestId ? target.guestName : values.guestName,
          amount: values.amount,
          paymentMethod: values.paymentMethod,
          // Adding onto a guest's row keeps a note already written there.
          notes: editing ? values.notes : values.notes || target.notes,
        }
      : {
          rowId: generateId(),
          guestId: null,
          guestName: values.guestName,
          giftId: null,
          amount: values.amount,
          paymentMethod: values.paymentMethod,
          notes: values.notes,
        };

    setGifts((prev) =>
      target ? prev.map((g) => (g.rowId === entry.rowId ? entry : g)) : [...prev, entry],
    );
    if (!(await persistEntry(entry, target))) {
      throw new Error(t('toast.giftSaveFailed'));
    }
  };

  const handleSheetDelete = () => {
    if (!sheetRowId) return;
    setEditSheetOpen(false);
    const promise = deleteRowGift(sheetRowId).then((deleted) => {
      if (!deleted) throw new Error(t('toast.error'));
    });
    toast.promise(promise, {
      loading: t('toast.deletingGift'),
      success: t('toast.giftDeleted'),
      error: (err) => (err instanceof Error ? err.message : t('toast.error')),
    });
  };

  const searchedGifts = searchQuery
    ? gifts.filter((g) =>
        g.guestName.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : gifts;
  const filteredGifts = searchedGifts.filter((g) => matchesGiftFilter(g, filter, methodFilter));
  // The phone list has no method picker, so a method chosen on the table does
  // not narrow it.
  const listedGifts = searchedGifts.filter((g) => matchesGiftFilter(g, filter));

  const getSheetRows = () =>
    buildGiftsSheetRows(gifts, {
      headers: [
        t('giftTable.guestName'),
        t('giftTable.amount'),
        t('giftTable.paymentMethod'),
        t('giftTable.notes'),
      ],
      total: t('export.total'),
      paymentMethod: (key) =>
        isPaymentMethodKey(key) ? t(`paymentMethods.${key}`) : key,
    });
  const exportFileName = toFileName(eventName, t('export.giftsFileName'));

  const emptyMessage = (shown: LocalGiftEntry[]) =>
    shown.length > 0
      ? null
      : searchQuery
        ? t('giftTable.searchEmpty', { query: searchQuery })
        : t('giftTable.filterEmpty');

  const sheet = (
    <GiftSheet
      open={sheetOpen}
      onOpenChange={handleSheetOpenChange}
      gift={addGiftOpen ? null : sheetEntry}
      guestSuggestions={guestSuggestions}
      onSave={handleSheetSave}
      onDelete={handleSheetDelete}
    />
  );

  if (gifts.length === 0) {
    return (
      <>
        <Empty className="min-h-[calc(100vh-280px)] border-none bg-card shadow-sm">
          <EmptyMedia>
            <img src="/hero-gifts.svg" alt="" aria-hidden="true" className="h-64 w-64" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>{t('giftEmpty.title')}</EmptyTitle>
            <EmptyDescription>{t('giftEmpty.description')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
        {sheet}
      </>
    );
  }

  const tableEmpty = emptyMessage(filteredGifts);
  const listEmpty = emptyMessage(listedGifts);

  return (
    <div dir={locale === 'he' ? 'rtl' : 'ltr'} className="flex flex-col gap-4">
      <GiftsHero
        summary={summary}
        confirmedGuestCount={confirmedGuestCount}
        onAddGift={() => onAddGiftOpenChange(true)}
      />

      {/* Desktop: the editable table */}
      <div className="hidden min-w-0 md:block">
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {/* Integrated toolbar */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b">
          <div className="relative">
            <Search
              size={14}
              className="text-muted-foreground absolute top-1/2 start-3 -translate-y-1/2 pointer-events-none"
            />
            <Input
              className="ps-9 h-8 w-52 bg-muted/40 border-muted/60 focus-visible:bg-background text-sm"
              placeholder={t('giftTable.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <FilterChips summary={summary} value={filter} onChange={setFilter} variant="table" />
          <Select
            value={methodFilter ?? 'all'}
            onValueChange={(value) => setMethodFilter(isPaymentMethodKey(value) ? value : null)}
          >
            <SelectTrigger
              size="sm"
              className={cn(
                'h-8 rounded-[10px] text-[13px] font-semibold',
                methodFilter && 'border-foreground',
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('giftTable.allMethods')}</SelectItem>
              {PAYMENT_METHODS.map((key) => (
                <SelectItem key={key} value={key}>
                  {t(`paymentMethods.${key}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="ms-auto">
            <DownloadSheetButton
              fileName={exportFileName}
              sheetName={t('export.giftsFileName')}
              getRows={getSheetRows}
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b bg-muted/20">
              <TableHead className="text-muted-foreground text-xs font-medium uppercase tracking-wide h-9 text-start">
                {t('giftTable.guestName')}
              </TableHead>
              <TableHead className="text-muted-foreground text-xs font-medium uppercase tracking-wide h-9 text-start w-28">
                {t('giftTable.amount')}
              </TableHead>
              <TableHead className="text-muted-foreground text-xs font-medium uppercase tracking-wide h-9 text-start w-36">
                {t('giftTable.paymentMethod')}
              </TableHead>
              <TableHead className="text-muted-foreground text-xs font-medium uppercase tracking-wide h-9 text-start">
                {t('giftTable.notes')}
              </TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGifts.map((gift) => (
              <TableRow key={gift.rowId} className="group border-b last:border-b-0">
                <GiftCell
                  gift={gift}
                  field="guestName"
                  editingCell={editingCell}
                  onStartEdit={setEditingCell}
                  onCommit={updateGift}
                />
                <GiftCell
                  gift={gift}
                  field="amount"
                  editingCell={editingCell}
                  onStartEdit={setEditingCell}
                  onCommit={updateGift}
                  type="number"
                  display={gift.amount !== '' ? formatCurrency(Number(gift.amount)) : undefined}
                  placeholder={t('giftTable.addAmount')}
                />
                <PaymentMethodCell
                  gift={gift}
                  editingCell={editingCell}
                  onStartEdit={setEditingCell}
                  onCommit={updateGift}
                />
                <GiftCell
                  gift={gift}
                  field="notes"
                  editingCell={editingCell}
                  onStartEdit={setEditingCell}
                  onCommit={updateGift}
                  placeholder={t('giftTable.addNote')}
                />
                <TableCell className="w-10 p-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                    onClick={() => handleDeleteGift(gift.rowId)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}

            {/* Quick-add row */}
            <TableRow className="border-0 hover:bg-transparent">
              <TableCell colSpan={5} className="p-0">
                <div className="flex items-center gap-2.5 border-t px-3 h-11">
                  <Plus size={13} className="text-muted-foreground shrink-0" />
                  <Input
                    ref={addInputRef}
                    value={newGuestName}
                    onChange={(e) => setNewGuestName(e.target.value)}
                    onKeyDown={handleAddRow}
                    placeholder={t('giftTable.addGuestPlaceholder')}
                    className="h-full rounded-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 placeholder:text-muted-foreground text-sm"
                  />
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {tableEmpty && (
        <p className="text-center text-sm text-muted-foreground py-4">{tableEmpty}</p>
      )}
      </div>

      {/* Phone: the table drops to a list, each row opening the sheet */}
      <div className="flex flex-col gap-2.5 md:hidden">
        <div className="flex items-center justify-between">
          <span className="text-base font-bold">{t('giftList.title')}</span>
          <DownloadSheetButton
            fileName={exportFileName}
            sheetName={t('export.giftsFileName')}
            getRows={getSheetRows}
          />
        </div>
        <div className="relative">
          <Search
            size={16}
            className="text-muted-foreground absolute top-1/2 start-3.5 -translate-y-1/2 pointer-events-none"
          />
          <Input
            className="bg-card h-11 rounded-xl ps-10 text-sm"
            placeholder={t('giftTable.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <FilterChips summary={summary} value={filter} onChange={setFilter} variant="list" />
        </div>
        {listedGifts.length > 0 && (
          <div className="bg-card overflow-hidden rounded-[14px] border">
            {listedGifts.map((gift) => (
              <GiftListRow key={gift.rowId} gift={gift} onOpen={() => openRowSheet(gift.rowId)} />
            ))}
          </div>
        )}
        {listEmpty && (
          <p className="text-center text-sm text-muted-foreground py-4">{listEmpty}</p>
        )}
      </div>

      {sheet}
    </div>
  );
}

function GiftListRow({ gift, onOpen }: { gift: LocalGiftEntry; onOpen: () => void }) {
  const t = useTranslations('budget');
  const amount = giftAmount(gift);
  const method = isPaymentMethodKey(gift.paymentMethod) ? gift.paymentMethod : null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="hover:bg-muted/40 flex min-h-16 w-full items-center gap-3 border-t px-3.5 py-2.5 text-start transition-colors first:border-t-0"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="truncate text-[15px] font-semibold">{gift.guestName}</span>
        <span className="flex min-w-0 items-center gap-1.5">
          <Badge
            variant="outline"
            className={cn(
              'shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold',
              amount === null
                ? 'bg-muted text-muted-foreground border-border'
                : PAYMENT_METHOD_BADGE[method ?? 'none'],
            )}
          >
            {amount === null
              ? t('giftList.noAmount')
              : method
                ? t(`paymentMethods.${method}`)
                : t('giftsHero.noMethod')}
          </Badge>
          {gift.notes && (
            <span className="text-muted-foreground truncate text-xs">{gift.notes}</span>
          )}
        </span>
      </div>
      {amount === null ? (
        <span className="text-primary shrink-0 text-sm font-semibold">{t('giftList.addAmount')}</span>
      ) : (
        <span className="shrink-0 text-base font-bold tabular-nums">{formatCurrency(amount)}</span>
      )}
    </button>
  );
}

interface GiftCellProps {
  gift: LocalGiftEntry;
  field: EditableField;
  editingCell: EditingCell | null;
  onStartEdit: (cell: EditingCell) => void;
  onCommit: (id: string, field: EditableField, value: string | number) => void;
  type?: 'text' | 'number';
  display?: string;
  placeholder?: string;
}

function GiftCell({
  gift,
  field,
  editingCell,
  onStartEdit,
  onCommit,
  type = 'text',
  display,
  placeholder = '',
}: GiftCellProps) {
  const isEditing = editingCell?.id === gift.rowId && editingCell?.field === field;
  const value = gift[field];
  const displayValue = display ?? (value !== '' && value !== undefined ? String(value) : null);

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const committed = type === 'number' ? (raw === '' ? '' : Number(raw)) : raw;
    onCommit(gift.rowId, field, committed as string | number);
    onStartEdit({ id: '', field: 'guestName' });
  };

  if (isEditing) {
    return (
      <TableCell className="p-0">
        <Input
          autoFocus
          type={type}
          defaultValue={value === '' ? '' : String(value)}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') {
              onStartEdit({ id: '', field: 'guestName' });
            }
          }}
          className="h-10 rounded-none border-0 border-b-2 border-b-primary bg-primary/5 px-3 shadow-none focus-visible:ring-0 text-sm"
        />
      </TableCell>
    );
  }

  return (
    <TableCell
      className="px-3 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors text-sm"
      onClick={() => onStartEdit({ id: gift.rowId, field })}
    >
      {displayValue ?? (
        <span className="text-muted-foreground/60 text-xs">{placeholder || '—'}</span>
      )}
    </TableCell>
  );
}

interface PaymentMethodCellProps {
  gift: LocalGiftEntry;
  editingCell: EditingCell | null;
  onStartEdit: (cell: EditingCell) => void;
  onCommit: (id: string, field: EditableField, value: string | number) => void;
}

function PaymentMethodCell({
  gift,
  editingCell,
  onStartEdit,
  onCommit,
}: PaymentMethodCellProps) {
  const t = useTranslations('budget');
  const isEditing =
    editingCell?.id === gift.rowId && editingCell?.field === 'paymentMethod';

  if (isEditing) {
    return (
      <TableCell className="p-0 w-36">
        <Select
          defaultOpen
          value={gift.paymentMethod || undefined}
          onValueChange={(val) => {
            onCommit(gift.rowId, 'paymentMethod', val);
            onStartEdit({ id: '', field: 'guestName' });
          }}
          onOpenChange={(open) => {
            if (!open) onStartEdit({ id: '', field: 'guestName' });
          }}
        >
          <SelectTrigger className="h-10 rounded-none border-0 border-b-2 border-b-primary bg-primary/5 px-3 shadow-none focus-visible:ring-0 w-full text-sm">
            <SelectValue placeholder={t('giftTable.selectPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_METHODS.map((key) => (
              <SelectItem key={key} value={key}>
                {t(`paymentMethods.${key}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
    );
  }

  return (
    <TableCell
      className="px-3 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors w-36"
      onClick={() => onStartEdit({ id: gift.rowId, field: 'paymentMethod' })}
    >
      {gift.paymentMethod ? (
        <Badge
          variant="outline"
          className={cn(
            'font-normal text-xs border',
            isPaymentMethodKey(gift.paymentMethod)
              ? PAYMENT_METHOD_BADGE[gift.paymentMethod]
              : PAYMENT_METHOD_BADGE.other,
          )}
        >
          {isPaymentMethodKey(gift.paymentMethod)
            ? t(`paymentMethods.${gift.paymentMethod}`)
            : gift.paymentMethod}
        </Badge>
      ) : (
        <span className="text-muted-foreground/60 text-xs">{t('giftTable.selectPaymentMethod')}</span>
      )}
    </TableCell>
  );
}
