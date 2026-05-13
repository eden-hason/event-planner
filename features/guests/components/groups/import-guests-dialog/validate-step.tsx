'use client';

import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { IconTrash, IconCheck, IconWand, IconInfoCircle } from '@tabler/icons-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { type ParsedCSV } from '@/features/guests/utils/parse-csv';
import { type ColumnMapping } from './map-step';
import {
  validateCsvRows,
  validateGuestData,
  normalizePhone,
  autoFixPhone,
  type ValidatedRow,
  type FieldErrors,
} from '@/features/guests/utils';

type RowEdit = Partial<{ name: string; phone: string; amount: number }>;

interface ValidateStepProps {
  parsedData: ParsedCSV | null;
  columnMapping: ColumnMapping;
  excludedRows: Set<number>;
  onExcludedRowsChange: (excludedRows: Set<number>) => void;
  existingPhones: Map<string, string>;
  rowEdits: Map<number, RowEdit>;
  onRowEditsChange: (edits: Map<number, RowEdit>) => void;
}

type EditingCell = { rowIndex: number; field: 'name' | 'phone' | 'amount' } | null;

function getMergedData(row: ValidatedRow, edits: Map<number, RowEdit>) {
  const edit = edits.get(row.rowIndex);
  return edit ? { ...row.data, ...edit } : { ...row.data };
}

function getRowValidation(
  row: ValidatedRow,
  edits: Map<number, RowEdit>,
  existingPhones: Map<string, string>,
  otherPhones: Set<string>,
): { isValid: boolean; fieldErrors: FieldErrors } {
  // Always re-validate against the live phone set; an edit on a sibling row
  // can introduce a duplicate that the cached base validation doesn't see.
  const merged = { ...row.data, ...(edits.get(row.rowIndex) ?? {}) };
  const { isValid, fieldErrors } = validateGuestData(
    { name: merged.name, phone: merged.phone, amount: merged.amount },
    existingPhones,
    otherPhones,
  );
  return { isValid, fieldErrors };
}

export function ValidateStep({
  parsedData,
  columnMapping,
  excludedRows,
  onExcludedRowsChange,
  existingPhones,
  rowEdits,
  onRowEditsChange,
}: ValidateStepProps) {
  const t = useTranslations('guests');
  const locale = useLocale();
  const dir = locale === 'he' ? 'rtl' : 'ltr';
  const [activeTab, setActiveTab] = useState<'all' | 'errors' | 'valid'>('errors');
  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [editValue, setEditValue] = useState('');
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const baseValidatedRows = useMemo(() => {
    if (!parsedData) return [];
    return validateCsvRows(parsedData.rows, columnMapping, existingPhones);
  }, [parsedData, columnMapping, existingPhones]);

  // Build phone set for all active rows for duplicate detection
  const allActivePhones = useMemo(() => {
    return new Set<string>(
      baseValidatedRows
        .filter((r) => !excludedRows.has(r.rowIndex))
        .map((r) => {
          const edit = rowEdits.get(r.rowIndex);
          return edit?.phone ?? r.data.phone ?? '';
        })
        .filter(Boolean)
        .map(normalizePhone),
    );
  }, [baseValidatedRows, excludedRows, rowEdits]);

  const displayRows = useMemo(() => {
    return baseValidatedRows.filter((r) => !excludedRows.has(r.rowIndex));
  }, [baseValidatedRows, excludedRows]);

  // Enrich each row with merged data + current validation state
  const enrichedRows = useMemo(() => {
    return displayRows.map((row) => {
      const merged = getMergedData(row, rowEdits);
      const phone = merged.phone;
      const otherPhones = new Set(allActivePhones);
      if (phone) otherPhones.delete(normalizePhone(phone));
      const { isValid, fieldErrors } = getRowValidation(row, rowEdits, existingPhones, otherPhones);
      return { ...row, mergedData: merged, isValid, fieldErrors };
    });
  }, [displayRows, rowEdits, existingPhones, allActivePhones]);

  const validCount = enrichedRows.filter((r) => r.isValid).length;
  const invalidCount = enrichedRows.filter((r) => !r.isValid).length;
  const totalCount = enrichedRows.length;

  // Sort: invalid rows first, then valid, preserving original order within each group
  const sortedRows = useMemo(() => {
    return [...enrichedRows].sort((a, b) => {
      if (a.isValid === b.isValid) return a.rowIndex - b.rowIndex;
      return a.isValid ? 1 : -1;
    });
  }, [enrichedRows]);

  const filteredRows = useMemo(() => {
    if (activeTab === 'errors') return sortedRows.filter((r) => !r.isValid);
    if (activeTab === 'valid') return sortedRows.filter((r) => r.isValid);
    return sortedRows;
  }, [sortedRows, activeTab]);

  const getPhoneConflictName = useCallback(
    (row: typeof enrichedRows[0]): string | undefined => {
      const errorKey = row.fieldErrors.phone;
      if (!errorKey) return undefined;
      const phone = row.mergedData.phone;
      if (!phone) return undefined;
      const normalized = normalizePhone(phone);

      if (errorKey === 'import.validate.errors.phoneExists') {
        const name = existingPhones.get(normalized);
        return name ? t('import.validate.errors.phoneConflictWith', { name }) : undefined;
      }

      if (errorKey === 'import.validate.errors.phoneDuplicateCsv') {
        const conflict = enrichedRows.find(
          (r) => r.rowIndex !== row.rowIndex && normalizePhone(r.mergedData.phone || '') === normalized,
        );
        return conflict?.mergedData.name
          ? t('import.validate.errors.phoneConflictWith', { name: conflict.mergedData.name })
          : undefined;
      }

      return undefined;
    },
    [enrichedRows, existingPhones, t],
  );

  // Count fixable phones: rows with phone error that autoFixPhone can resolve
  const fixableCount = useMemo(() => {
    return enrichedRows.filter((row) => {
      if (!row.fieldErrors.phone) return false;
      const phone = row.mergedData.phone ?? '';
      return autoFixPhone(phone) !== null;
    }).length;
  }, [enrichedRows]);

  const handleRemoveRow = (rowIndex: number) => {
    const newExcluded = new Set(excludedRows);
    newExcluded.add(rowIndex);
    onExcludedRowsChange(newExcluded);
    if (editingCell?.rowIndex === rowIndex) setEditingCell(null);
    setPendingDelete(null);
  };

  const handleResetRow = (rowIndex: number) => {
    const newEdits = new Map(rowEdits);
    newEdits.delete(rowIndex);
    onRowEditsChange(newEdits);
  };

  const startEditing = (row: typeof enrichedRows[0], field: 'name' | 'phone' | 'amount') => {
    setEditingCell({ rowIndex: row.rowIndex, field });
    const val = row.mergedData[field];
    setEditValue(val !== undefined && val !== null ? String(val) : '');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const commitEdit = useCallback(
    (rowIndex: number, field: 'name' | 'phone' | 'amount', value: string) => {
      const row = baseValidatedRows.find((r) => r.rowIndex === rowIndex);
      if (!row) return;

      const currentEdit = rowEdits.get(rowIndex) ?? {};
      const originalValue = row.data[field];
      const newValue = field === 'amount' ? Number(value) || 1 : value.trim();

      // If value matches original, clear the edit for this field
      const updatedEdit = { ...currentEdit, [field]: newValue };
      if (String(newValue) === String(originalValue)) {
        delete updatedEdit[field];
      }

      const newEdits = new Map(rowEdits);
      if (Object.keys(updatedEdit).length === 0) {
        newEdits.delete(rowIndex);
      } else {
        newEdits.set(rowIndex, updatedEdit);
      }
      onRowEditsChange(newEdits);
      setEditingCell(null);
    },
    [baseValidatedRows, rowEdits, onRowEditsChange],
  );

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    field: 'name' | 'phone' | 'amount',
  ) => {
    if (e.key === 'Enter') {
      commitEdit(rowIndex, field, editValue);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const handleAutoFix = () => {
    let fixedCount = 0;
    const newEdits = new Map(rowEdits);

    enrichedRows.forEach((row) => {
      if (!row.fieldErrors.phone) return;
      const phone = row.mergedData.phone ?? '';
      const fixed = autoFixPhone(phone);
      if (fixed) {
        const current = newEdits.get(row.rowIndex) ?? {};
        newEdits.set(row.rowIndex, { ...current, phone: fixed });
        fixedCount++;
      }
    });

    if (fixedCount > 0) {
      onRowEditsChange(newEdits);
      toast.success(t('import.validate.autoFixApplied', { count: fixedCount }));
    } else {
      toast.info(t('import.validate.autoFixNoneAvailable'));
    }
  };

  // When all errors are resolved, switch off the errors tab
  useEffect(() => {
    if (invalidCount === 0 && activeTab === 'errors') setActiveTab('all');
  }, [invalidCount, activeTab]);

  if (!parsedData) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-muted-foreground">No data to validate</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="text-sm">
        <p className="font-medium">{t('import.validate.heading')}</p>
        <p className="text-muted-foreground">{t('import.validate.description')}</p>
      </div>

      {/* Filter tabs + table */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="border-border h-8 w-full justify-start rounded-none border-b bg-transparent p-0">
          <TabsTrigger
            value="all"
            className="data-[state=active]:text-primary data-[state=active]:after:bg-primary relative h-full flex-1 rounded-none border-none bg-transparent px-1 pb-2 text-xs shadow-none after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            {t('import.validate.tabAll')} <span className="ms-1 text-muted-foreground">{totalCount}</span>
          </TabsTrigger>
          <TabsTrigger
            value="errors"
            className="data-[state=active]:text-primary data-[state=active]:after:bg-primary relative h-full flex-1 rounded-none border-none bg-transparent px-1 pb-2 text-xs shadow-none after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            {t('import.validate.tabNeedsFix')}
            {invalidCount > 0 && (
              <Badge className="ms-1.5 h-4 min-w-4 border-transparent bg-red-100 px-1 text-[10px] text-red-700 dark:bg-red-900/40 dark:text-red-400">
                {invalidCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="valid"
            className="data-[state=active]:text-primary data-[state=active]:after:bg-primary relative h-full flex-1 rounded-none border-none bg-transparent px-1 pb-2 text-xs shadow-none after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            {t('import.validate.tabValid')} <span className="ms-1 text-muted-foreground">{validCount}</span>
          </TabsTrigger>
        </TabsList>

        {(['all', 'errors', 'valid'] as const).map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-0">
            <div className="overflow-hidden rounded-b-lg border border-t-0">
              <div className="max-h-[280px] overflow-y-auto">
                {filteredRows.length === 0 ? (
                  <EmptyState tab={tab} t={t} />
                ) : (
                  <Table dir={dir}>
                    <TableHeader className="bg-muted/60 sticky top-0 backdrop-blur-sm">
                      <TableRow className="border-b">
                        <TableHead className="w-[90px] py-2 text-xs">{t('import.validate.colStatus')}</TableHead>
                        <TableHead className="w-[40px] py-2 text-xs">{t('import.validate.colRow')}</TableHead>
                        <TableHead className="py-2 text-xs">{t('import.validate.colName')}</TableHead>
                        <TableHead className="py-2 text-xs">{t('import.validate.colPhone')}</TableHead>
                        <TableHead className="w-[70px] py-2 text-xs">{t('import.validate.colAmount')}</TableHead>
                        <TableHead className="w-[80px] py-2 text-xs"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRows.map((row) => {
                        const hasEdits = rowEdits.has(row.rowIndex);
                        return (
                          <TableRow
                            key={row.rowIndex}
                            className={cn(
                              'group',
                              !row.isValid && 'bg-red-50/60 dark:bg-red-950/20',
                            )}
                          >
                            {/* Status pill */}
                            <TableCell className="p-2">
                              <span className={cn(
                                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                                row.isValid
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                                  : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
                              )}>
                                {row.isValid && <IconCheck size={10} strokeWidth={2.5} />}
                                {row.isValid ? t('import.validate.statusReady') : t('import.validate.statusNeedsFix')}
                              </span>
                            </TableCell>

                            {/* Row number */}
                            <TableCell className="p-2 text-xs text-muted-foreground">
                              {row.rowIndex + 1}
                            </TableCell>

                            {/* Name cell */}
                            <EditableCell
                              rowIndex={row.rowIndex}
                              field="name"
                              value={String(row.mergedData.name || '')}
                              error={row.fieldErrors.name ? t(row.fieldErrors.name as Parameters<typeof t>[0]) : undefined}
                              isEditing={editingCell?.rowIndex === row.rowIndex && editingCell?.field === 'name'}
                              editValue={editValue}
                              inputRef={editingCell?.rowIndex === row.rowIndex && editingCell?.field === 'name' ? inputRef : undefined}
                              onStartEdit={() => startEditing(row, 'name')}
                              onEditChange={setEditValue}
                              onCommit={(val) => commitEdit(row.rowIndex, 'name', val)}
                              onKeyDown={(e) => handleKeyDown(e, row.rowIndex, 'name')}
                              ariaLabel={t('import.validate.editNameAria', { row: row.rowIndex + 1 })}
                              inputType="text"
                            />

                            {/* Phone cell */}
                            <EditableCell
                              rowIndex={row.rowIndex}
                              field="phone"
                              value={row.mergedData.phone || ''}
                              error={row.fieldErrors.phone ? t(row.fieldErrors.phone as Parameters<typeof t>[0]) : undefined}
                              errorHint={getPhoneConflictName(row)}
                              dir={dir}
                              isEditing={editingCell?.rowIndex === row.rowIndex && editingCell?.field === 'phone'}
                              editValue={editValue}
                              inputRef={editingCell?.rowIndex === row.rowIndex && editingCell?.field === 'phone' ? inputRef : undefined}
                              onStartEdit={() => startEditing(row, 'phone')}
                              onEditChange={setEditValue}
                              onCommit={(val) => commitEdit(row.rowIndex, 'phone', val)}
                              onKeyDown={(e) => handleKeyDown(e, row.rowIndex, 'phone')}
                              ariaLabel={t('import.validate.editPhoneAria', { row: row.rowIndex + 1 })}
                              inputType="tel"
                            />

                            {/* Amount cell */}
                            <EditableCell
                              rowIndex={row.rowIndex}
                              field="amount"
                              value={String(row.mergedData.amount ?? 1)}
                              error={row.fieldErrors.amount ? t(row.fieldErrors.amount as Parameters<typeof t>[0]) : undefined}
                              isEditing={editingCell?.rowIndex === row.rowIndex && editingCell?.field === 'amount'}
                              editValue={editValue}
                              inputRef={editingCell?.rowIndex === row.rowIndex && editingCell?.field === 'amount' ? inputRef : undefined}
                              onStartEdit={() => startEditing(row, 'amount')}
                              onEditChange={setEditValue}
                              onCommit={(val) => commitEdit(row.rowIndex, 'amount', val)}
                              onKeyDown={(e) => handleKeyDown(e, row.rowIndex, 'amount')}
                              ariaLabel={t('import.validate.editAmountAria', { row: row.rowIndex + 1 })}
                              inputType="number"
                            />

                            {/* Actions */}
                            <TableCell className="p-2">
                              <div className="flex items-center justify-end gap-1">
                                {hasEdits && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-muted-foreground h-7 w-7 text-[10px] opacity-0 transition-opacity group-hover:opacity-100"
                                        onClick={() => handleResetRow(row.rowIndex)}
                                      >
                                        ↺
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">{t('import.validate.resetRow')}</TooltipContent>
                                  </Tooltip>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-muted-foreground h-7 w-7 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
                                  onClick={() => setPendingDelete(row.rowIndex)}
                                  aria-label={t('import.validate.removeRow', { row: row.rowIndex + 1 })}
                                >
                                  <IconTrash size={14} />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Summary bar */}
      <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className={cn(
              'text-sm font-semibold tabular-nums',
              invalidCount === 0 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400',
            )}>
              {t('import.validate.summaryReady', { valid: validCount, total: totalCount })}
            </span>
            {/* Progress dots */}
            <div className="mt-1 flex gap-0.5">
              {Array.from({ length: Math.min(totalCount, 20) }).map((_, i) => {
                const isValid = i < Math.round((validCount / totalCount) * Math.min(totalCount, 20));
                return (
                  <span
                    key={i}
                    className={cn(
                      'h-1.5 w-1.5 rounded-full transition-colors',
                      isValid ? 'bg-green-500' : 'bg-red-300 dark:bg-red-700',
                    )}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoFix}
              disabled={fixableCount === 0}
              className="h-8 gap-1.5 text-xs"
            >
              <IconWand size={13} />
              {t('import.validate.autoFixPhones')}
              {fixableCount > 0 && (
                <span className="text-muted-foreground">
                  {t('import.validate.autoFixPhonesCount', { count: fixableCount })}
                </span>
              )}
            </Button>
          </TooltipTrigger>
          {fixableCount === 0 && (
            <TooltipContent side="top">
              {t('import.validate.autoFixNoneAvailable')}
            </TooltipContent>
          )}
        </Tooltip>
      </div>
      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('import.validate.deleteDialogTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('import.validate.deleteDialogDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('import.validate.deleteDialogCancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-400 dark:hover:bg-red-900/60"
              onClick={() => pendingDelete !== null && handleRemoveRow(pendingDelete)}
            >
              {t('import.validate.deleteDialogConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Editable cell ──────────────────────────────────────────────────────────────

interface EditableCellProps {
  rowIndex: number;
  field: string;
  value: string;
  error: string | undefined;
  errorHint?: string;
  dir?: 'ltr' | 'rtl';
  isEditing: boolean;
  editValue: string;
  inputRef: React.RefObject<HTMLInputElement> | undefined;
  onStartEdit: () => void;
  onEditChange: (val: string) => void;
  onCommit: (val: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  ariaLabel: string;
  inputType: 'text' | 'tel' | 'number';
}

function EditableCell({
  value,
  error,
  errorHint,
  dir,
  isEditing,
  editValue,
  inputRef,
  onStartEdit,
  onEditChange,
  onCommit,
  onKeyDown,
  ariaLabel,
  inputType,
  field,
  rowIndex,
}: EditableCellProps) {
  const errorId = `err-${rowIndex}-${field}`;
  const hintSide = dir === 'rtl' ? 'left' : 'right';

  return (
    <TableCell className="p-2">
      <div className="flex flex-col gap-0.5">
        {isEditing ? (
          <Input
            ref={inputRef}
            type={inputType}
            value={editValue}
            dir={inputType === 'tel' || inputType === 'number' ? 'ltr' : undefined}
            onChange={(e) => onEditChange(e.target.value)}
            onBlur={() => onCommit(editValue)}
            onKeyDown={onKeyDown}
            className={cn(
              'h-7 text-xs',
              error && 'ring-2 ring-destructive/50 focus-visible:ring-destructive',
            )}
            aria-describedby={error ? errorId : undefined}
          />
        ) : (
          <button
            type="button"
            onClick={onStartEdit}
            aria-label={ariaLabel}
            className={cn(
              'group/cell flex w-full items-center rounded px-1.5 py-1 text-start text-xs transition-colors',
              'hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              error && 'ring-1 ring-destructive/40',
              !value && 'text-muted-foreground italic',
            )}
          >
            <span
              dir={inputType === 'tel' || inputType === 'number' ? 'ltr' : undefined}
              className="max-w-[120px] truncate"
            >
              {value || '—'}
            </span>
          </button>
        )}
        {error && (
          <p
            id={errorId}
            role="alert"
            className="flex items-center gap-1 px-1.5 text-[10px] leading-tight text-red-700 dark:text-red-400"
          >
            <span>{error}</span>
            {errorHint && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex shrink-0 text-red-400 hover:text-red-600 focus:outline-none dark:text-red-500 dark:hover:text-red-300"
                  >
                    <IconInfoCircle size={11} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side={hintSide} className="max-w-[200px] text-xs">
                  {errorHint}
                </TooltipContent>
              </Tooltip>
            )}
          </p>
        )}
      </div>
    </TableCell>
  );
}

// ── Empty states ───────────────────────────────────────────────────────────────

function EmptyState({
  tab,
  t,
}: {
  tab: 'all' | 'errors' | 'valid';
  t: ReturnType<typeof useTranslations<'guests'>>;
}) {
  if (tab === 'errors') {
    return (
      <div className="flex flex-col items-center justify-center gap-1 py-10">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <IconCheck size={20} className="text-green-600 dark:text-green-400" />
        </span>
        <p className="mt-2 text-sm font-medium">{t('import.validate.emptyNeedsFix')}</p>
        <p className="text-xs text-muted-foreground">{t('import.validate.emptyNeedsFixSub')}</p>
      </div>
    );
  }

  if (tab === 'valid') {
    return (
      <div className="flex flex-col items-center justify-center gap-1 py-10">
        <p className="text-sm font-medium">{t('import.validate.emptyValid')}</p>
        <p className="text-xs text-muted-foreground">{t('import.validate.emptyValidSub')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-10">
      <p className="text-sm text-muted-foreground">No data to validate</p>
    </div>
  );
}
