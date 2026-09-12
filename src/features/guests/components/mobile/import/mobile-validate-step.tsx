'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { IconEdit, IconSparkles } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  autoFixPhone,
  normalizePhone,
  type ColumnMapping,
} from '@/features/guests/utils/import-guests';
import type { ParsedCSV } from '@/features/guests/utils/parse-csv';
import type { GroupApp } from '@/features/guests/schemas';
import {
  computeMergedRows,
  isNewGroup,
  type RowEditsMap,
} from './compute-import-rows';
import { MobileRowEditSheet, type RowEditDraft } from './mobile-row-edit-sheet';

type Tab = 'errors' | 'valid';

interface MobileValidateStepProps {
  parsedData: ParsedCSV;
  columnMapping: ColumnMapping;
  existingPhones: Map<string, string>;
  groups: GroupApp[];
  excludedRows: Set<number>;
  onExcludedRowsChange: (rows: Set<number>) => void;
  rowEdits: RowEditsMap;
  onRowEditsChange: (edits: RowEditsMap) => void;
  onImport: () => void;
}

export function MobileValidateStep({
  parsedData,
  columnMapping,
  existingPhones,
  groups,
  excludedRows,
  onExcludedRowsChange,
  rowEdits,
  onRowEditsChange,
  onImport,
}: MobileValidateStepProps) {
  const t = useTranslations('guests.import');
  const tv = useTranslations('guests.import.mobile.validate');
  const [tab, setTab] = useState<Tab>('errors');
  const [editingRow, setEditingRow] = useState<number | null>(null);

  const mergedRows = useMemo(
    () =>
      computeMergedRows(parsedData.rows, columnMapping, existingPhones, rowEdits, excludedRows),
    [parsedData.rows, columnMapping, existingPhones, rowEdits, excludedRows],
  );

  const activeRows = mergedRows.filter((r) => !excludedRows.has(r.rowIndex));
  const validRows = activeRows.filter((r) => r.isValid);
  const needsFixRows = activeRows.filter((r) => !r.isValid);

  const shownRows = tab === 'errors' ? needsFixRows : validRows;

  const fixablePhoneCount = needsFixRows.filter(
    (r) => r.fieldErrors.phone && r.data.phone && autoFixPhone(r.data.phone) !== null,
  ).length;

  const handleAutofix = () => {
    const next = new Map(rowEdits);
    let fixedCount = 0;
    for (const row of needsFixRows) {
      if (!row.fieldErrors.phone || !row.data.phone) continue;
      const fixed = autoFixPhone(row.data.phone);
      if (fixed) {
        next.set(row.rowIndex, { ...next.get(row.rowIndex), phone: fixed });
        fixedCount++;
      }
    }
    if (fixedCount > 0) {
      onRowEditsChange(next);
      toast.success(
        t('validate.autoFixApplied', { count: fixedCount }),
      );
    } else {
      toast.info(t('validate.autoFixNoneAvailable'));
    }
  };

  const editingMerged = mergedRows.find((r) => r.rowIndex === editingRow) ?? null;
  const editingIsNewGroup = editingMerged
    ? isNewGroup(groups, editingMerged.data.group, editingMerged.data.side)
    : false;

  const otherCsvPhonesForEditing = useMemo(() => {
    if (editingRow === null) return new Set<string>();
    const phones = new Set<string>();
    for (const row of mergedRows) {
      if (row.rowIndex === editingRow || excludedRows.has(row.rowIndex)) continue;
      if (row.data.phone) phones.add(normalizePhone(row.data.phone));
    }
    return phones;
  }, [mergedRows, editingRow, excludedRows]);

  const tabs: Array<{ key: Tab; label: string; count: number }> = [
    { key: 'errors', label: t('validate.tabNeedsFix'), count: needsFixRows.length },
    { key: 'valid', label: t('validate.tabValid'), count: validRows.length },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="bg-card flex shrink-0 border-b">
        {tabs.map(({ key, label, count }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                'flex h-11 flex-1 items-center justify-center gap-1.5 border-b-2 text-sm font-semibold',
                active
                  ? 'border-primary text-primary'
                  : 'text-muted-foreground border-transparent',
              )}
            >
              {label}
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[11px] font-bold',
                  active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
        {fixablePhoneCount > 0 && tab !== 'valid' && (
          <button
            type="button"
            onClick={handleAutofix}
            className="bg-warning/10 border-warning/30 flex items-center gap-2.5 rounded-xl border p-3 text-start"
          >
            <span className="bg-warning text-background flex size-8 shrink-0 items-center justify-center rounded-lg">
              <IconSparkles size={15} />
            </span>
            <div className="flex-1">
              <div className="text-warning text-sm font-semibold">
                {tv('autofixBannerTitle', { count: fixablePhoneCount })}
              </div>
              <div className="text-warning/80 text-xs">
                {tv('autofixBannerSubtitle')}
              </div>
            </div>
            <span className="text-warning text-sm font-semibold">
              {tv('autofixAction')}
            </span>
          </button>
        )}

        {shownRows.map((row) => {
          const initial = row.data.name ? row.data.name[0] : '?';
          const noName = !row.data.name;
          const badPhone = Boolean(row.fieldErrors.phone);
          const newGroup = isNewGroup(groups, row.data.group, row.data.side);

          const badges: string[] = [];
          if (row.fieldErrors.name) badges.push(tv('issueMissingName'));
          if (row.fieldErrors.phone === 'import.validate.errors.phoneInvalid')
            badges.push(tv('issueInvalidPhone'));
          if (row.fieldErrors.phone === 'import.validate.errors.phoneExists')
            badges.push(tv('issuePhoneExists'));
          if (row.fieldErrors.phone === 'import.validate.errors.phoneDuplicateCsv')
            badges.push(tv('issuePhoneDuplicateCsv'));
          if (newGroup) badges.push(tv('issueNewGroup'));

          return (
            <button
              key={row.rowIndex}
              type="button"
              onClick={() => setEditingRow(row.rowIndex)}
              className={cn(
                'flex flex-col gap-2 rounded-xl border bg-card p-3 text-start',
                !row.isValid ? 'border-destructive/30' : 'border-border',
              )}
            >
              <div className="flex w-full items-center gap-2.5">
                <span
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                    !row.isValid
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-primary/10 text-primary',
                  )}
                >
                  {initial}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span
                    className={cn(
                      'truncate text-[15px] font-semibold',
                      noName && 'text-destructive',
                    )}
                  >
                    {row.data.name || tv('issueMissingName')}
                  </span>
                  <div className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs">
                    <span
                      dir="ltr"
                      className={cn(
                        'whitespace-nowrap',
                        badPhone && 'text-destructive underline decoration-wavy',
                      )}
                    >
                      {row.data.phone || '-'}
                    </span>
                    <span>·</span>
                    <span className="whitespace-nowrap">
                      {tv('seatsCount', { count: row.data.amount })}
                    </span>
                    {row.data.group && (
                      <>
                        <span>·</span>
                        <span className="min-w-0 truncate">{row.data.group}</span>
                      </>
                    )}
                  </div>
                </div>
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-lg',
                    !row.isValid
                      ? 'bg-primary text-primary-foreground'
                      : 'border-input text-muted-foreground border bg-card',
                  )}
                >
                  <IconEdit size={15} />
                </span>
              </div>
              {badges.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {badges.map((label) => (
                    <span
                      key={label}
                      className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[11px] font-semibold"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              )}
            </button>
          );
        })}

        {shownRows.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-1 py-16 text-center">
            <span className="text-sm font-semibold">
              {tab === 'errors' ? t('validate.emptyNeedsFix') : t('validate.emptyValid')}
            </span>
            <span className="text-muted-foreground text-xs">
              {tab === 'errors'
                ? t('validate.emptyNeedsFixSub')
                : t('validate.emptyValidSub')}
            </span>
          </div>
        )}
      </div>

      <div className="bg-card flex shrink-0 flex-col gap-1.5 border-t p-3">
        <Button disabled={validRows.length === 0} onClick={onImport}>
          {tv('importCount', { count: validRows.length })}
        </Button>
        <span className="text-muted-foreground text-center text-xs">
          {needsFixRows.length > 0
            ? tv('footerSkip', { count: needsFixRows.length })
            : tv('footerAllGood')}
        </span>
      </div>

      <MobileRowEditSheet
        open={editingRow !== null}
        onOpenChange={(open) => {
          if (!open) setEditingRow(null);
        }}
        data={editingMerged?.data ?? null}
        groups={groups}
        isNewGroup={editingIsNewGroup}
        existingPhones={existingPhones}
        otherCsvPhones={otherCsvPhonesForEditing}
        onSave={(draft: RowEditDraft) => {
          if (editingRow === null) return;
          const next = new Map(rowEdits);
          next.set(editingRow, {
            name: draft.name,
            phone: draft.phone,
            amount: draft.amount,
            side: draft.side,
            group: draft.group || undefined,
          });
          onRowEditsChange(next);
        }}
        onRemove={() => {
          if (editingRow === null) return;
          const next = new Set(excludedRows);
          next.add(editingRow);
          onExcludedRowsChange(next);
        }}
      />
    </div>
  );
}
