'use client';

import { useState, useRef, useCallback, useTransition, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { toast } from 'sonner';
import { Search, Trash2, Plus } from 'lucide-react';
import { Cell, Label, Pie, PieChart } from 'recharts';
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
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import type { GiftRow } from '../types';
import { upsertGift, deleteGift } from '../actions/gifts';

const PAYMENT_METHODS = ['cash', 'bit', 'paybox', 'check', 'other'] as const;
type PaymentMethodKey = typeof PAYMENT_METHODS[number];

const PAYMENT_METHOD_COLORS: Record<string, string> = {
  cash: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  bit: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20',
  paybox: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
  check: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  other: 'bg-muted text-muted-foreground border-border',
};

const PAYMENT_METHOD_CHART_COLORS: Record<string, string> = {
  cash: '#f97316',
  bit: '#14b8a6',
  paybox: '#8b5cf6',
  check: '#3b82f6',
  other: '#94a3b8',
};


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

function PaymentMethodChart({ gifts }: { gifts: LocalGiftEntry[] }) {
  const t = useTranslations('budget');
  const chartConfig: ChartConfig = { amount: { label: t('giftTable.amount') } } satisfies ChartConfig;
  const data = useMemo(() => {
    const map = new Map<string, number>();
    for (const gift of gifts) {
      if (!gift.paymentMethod || gift.amount === '') continue;
      const amount = Number(gift.amount);
      if (amount <= 0) continue;
      map.set(gift.paymentMethod, (map.get(gift.paymentMethod) ?? 0) + amount);
    }
    return Array.from(map.entries())
      .map(([name, amount]) => ({
        name,
        amount,
        color: PAYMENT_METHOD_CHART_COLORS[name] ?? PAYMENT_METHOD_CHART_COLORS['אחר'],
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [gifts]);

  const total = useMemo(() => data.reduce((sum, d) => sum + d.amount, 0), [data]);

  if (data.length === 0) {
    return (
      <div className="bg-card rounded-xl border p-4">
        <p className="text-sm font-semibold">{t('giftsChart.title')}</p>
        <p className="text-xs text-muted-foreground mt-1">{t('giftsChart.noData')}</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border p-4">
      <p className="text-sm font-semibold mb-1">{t('giftsChart.breakdown')}</p>

      <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[170px]">
        <PieChart>
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
          <Pie data={data} dataKey="amount" nameKey="name" innerRadius={50} outerRadius={72} strokeWidth={3}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
            <Label
              content={({ viewBox }) => {
                if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                  return (
                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                      <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-base font-bold">
                        {`₪${total.toLocaleString()}`}
                      </tspan>
                      <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 16} className="fill-muted-foreground text-[10px]">
                        {t('giftsChart.total')}
                      </tspan>
                    </text>
                  );
                }
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>

      <div className="space-y-2 mt-2">
        {data.map((d) => {
          const pct = total > 0 ? Math.round((d.amount / total) * 100) : 0;
          return (
            <div key={d.name} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-muted-foreground text-xs">{t(`paymentMethods.${d.name}`)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold tabular-nums text-xs">{`₪${d.amount.toLocaleString()}`}</span>
                  <span className="text-muted-foreground text-xs w-7 text-left">{pct}%</span>
                </div>
              </div>
              <div className="bg-muted h-1 w-full overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, backgroundColor: d.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function GiftsTab({
  eventId,
  initialGifts,
}: {
  eventId: string;
  initialGifts: GiftRow[];
}) {
  const t = useTranslations('budget');
  const locale = useLocale();
  const [gifts, setGifts] = useState<LocalGiftEntry[]>(() =>
    initialGifts.map(toLocalEntry),
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [newGuestName, setNewGuestName] = useState('');
  const addInputRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();
  const giftsRef = useRef(gifts);
  giftsRef.current = gifts;

  const updateGift = useCallback(
    (rowId: string, field: EditableField, value: string | number) => {
      const current = giftsRef.current.find((g) => g.rowId === rowId);
      if (!current) return;

      const entry = { ...current, [field]: value };

      setGifts((prev) => prev.map((g) => (g.rowId === rowId ? entry : g)));

      startTransition(async () => {
        const result = await upsertGift(eventId, {
          giftId: entry.giftId,
          guestId: entry.guestId,
          guestName: entry.guestName,
          amount: entry.amount === '' ? null : Number(entry.amount),
          paymentMethod: entry.paymentMethod || null,
          notes: entry.notes || null,
        });
        if (!result.success) {
          setGifts((prev) => prev.map((g) => (g.rowId === rowId ? current : g)));
          toast.error(result.message ?? 'Failed to save gift.');
          return;
        }
        if (result.giftId && !entry.giftId) {
          setGifts((prev) =>
            prev.map((g) =>
              g.rowId === rowId ? { ...g, giftId: result.giftId } : g,
            ),
          );
        }
      });
    },
    [eventId],
  );

  const handleDeleteGift = useCallback((rowId: string) => {
    const entry = giftsRef.current.find((g) => g.rowId === rowId);
    if (!entry) return;
    setGifts((prev) => prev.filter((g) => g.rowId !== rowId));
    if (entry.giftId) {
      startTransition(() => { void deleteGift(eventId, entry.giftId!); });
    }
  }, [eventId]);

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

  const filteredGifts = searchQuery
    ? gifts.filter((g) =>
        g.guestName.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : gifts;

  if (initialGifts.length === 0) {
    return (
      <Empty className="min-h-[calc(100vh-280px)] border-none bg-card shadow-sm">
        <EmptyMedia>
          <img src="/hero-gifts.svg" alt="" aria-hidden="true" className="h-64 w-64" />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>{t('giftEmpty.title')}</EmptyTitle>
          <EmptyDescription>{t('giftEmpty.description')}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div dir={locale === 'he' ? 'rtl' : 'ltr'} className="grid grid-cols-[1fr_340px] gap-4 items-start">
      {/* Table column */}
      <div className="min-w-0">
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {/* Integrated toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b">
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
                  display={gift.amount !== '' ? `₪${Number(gift.amount).toLocaleString()}` : undefined}
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

      {filteredGifts.length === 0 && searchQuery && (
        <p className="text-center text-sm text-muted-foreground py-4">
          {t('giftTable.searchEmpty', { query: searchQuery })}
        </p>
      )}
      </div>

      {/* Stats sidebar */}
      <div>
        <PaymentMethodChart gifts={gifts} />
      </div>
    </div>
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
            PAYMENT_METHOD_COLORS[gift.paymentMethod] ?? PAYMENT_METHOD_COLORS.other,
          )}
        >
          {t(`paymentMethods.${gift.paymentMethod as PaymentMethodKey}`)}
        </Badge>
      ) : (
        <span className="text-muted-foreground/60 text-xs">{t('giftTable.selectPaymentMethod')}</span>
      )}
    </TableCell>
  );
}
