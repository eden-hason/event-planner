'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DEFAULT_CAPACITY,
  MAX_CAPACITY,
  MAX_TABLE_NUMBER,
  MIN_CAPACITY,
  TableFormSchema,
  type TableFormValues,
} from '../schemas';
import type { TableApp } from '../types';
import { ShapePicker } from './shape-picker';
import { useSeatingCopy } from './use-seating-copy';

export type { TableFormValues } from '../schemas';

interface TableFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing; absent when creating. */
  table?: TableApp | null;
  /** Next free number, used to prefill and to explain the prefill. */
  nextNumber: number;
  highestNumber: number;
  /** Seats already taken here - capacity may not be set below it. */
  seatedHeads?: number;
  error: string | null;
  isPending: boolean;
  onSubmit: (values: TableFormValues) => void;
}

/**
 * Single-Table creation and editing.
 *
 * The number is required, positive and unique within the Event; the label is
 * optional and never replaces it, because the number is what a guest looks for
 * on the night (ADR-0008). Capacity is prefilled at 10 and kept visible - never
 * inferred from tables created earlier.
 *
 * Validation is React Hook Form + the shared `TableFormSchema`, so the numeric
 * bounds are not re-encoded here. The one rule the schema cannot know - capacity
 * may not drop below who is already seated - is layered on with `superRefine`.
 */
export function TableFormDialog({
  open,
  onOpenChange,
  table,
  nextNumber,
  highestNumber,
  seatedHeads = 0,
  error,
  isPending,
  onSubmit,
}: TableFormDialogProps) {
  const { t, tableTitle } = useSeatingCopy();
  const isEdit = Boolean(table);
  const minCapacity = Math.max(MIN_CAPACITY, seatedHeads);

  const schema = React.useMemo(
    () =>
      TableFormSchema.superRefine((values, ctx) => {
        if (values.capacity < minCapacity) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['capacity'],
            message: t('table.seatHintOccupied', { occupancy: seatedHeads }),
          });
        }
      }),
    [minCapacity, seatedHeads, t],
  );

  const defaults = React.useCallback(
    (): TableFormValues =>
      table
        ? {
            tableNumber: table.tableNumber,
            label: table.label ?? '',
            capacity: table.capacity,
            shape: table.shape,
          }
        : {
            tableNumber: nextNumber,
            label: '',
            capacity: DEFAULT_CAPACITY,
            shape: 'round',
          },
    [table, nextNumber],
  );

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaults(),
  });

  // Dialog reset behavior: every fresh open re-seeds from the current table (or
  // the next free number), discarding an abandoned edit.
  React.useEffect(() => {
    if (open) form.reset(defaults());
  }, [open, defaults, form]);

  const submitting = isPending || form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit && table
              ? t('editDialog.title', { table: tableTitle(table) })
              : t('createDialog.title')}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? t('editDialog.description') : t('createDialog.description')}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="border-destructive/40 bg-destructive/5 flex items-start gap-2 rounded-lg border p-3">
            <TriangleAlert className="text-destructive mt-0.5 size-4 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) =>
              onSubmit({ ...values, label: values.label.trim() }),
            )}
          >
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="tableNumber"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>{t('createDialog.number')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={MAX_TABLE_NUMBER}
                        value={Number.isFinite(field.value) ? field.value : ''}
                        onChange={(event) =>
                          field.onChange(event.target.valueAsNumber)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>
                      {t('createDialog.label')}{' '}
                      <span className="text-muted-foreground font-normal">
                        {t('createDialog.labelOptional')}
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        maxLength={50}
                        placeholder={t('createDialog.labelPlaceholder')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="capacity"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>{t('createDialog.seats')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={minCapacity}
                      max={MAX_CAPACITY}
                      value={Number.isFinite(field.value) ? field.value : ''}
                      onChange={(event) =>
                        field.onChange(event.target.valueAsNumber)
                      }
                    />
                  </FormControl>
                  {seatedHeads > 0 && (
                    <p className="text-muted-foreground text-xs">
                      {t('table.seatHintOccupied', { occupancy: seatedHeads })}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="shape"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <Label>{t('createDialog.shape')}</Label>
                  <ShapePicker value={field.value} onChange={field.onChange} />
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEdit && (
              <p className="text-muted-foreground text-xs">
                {highestNumber > 0
                  ? t('createDialog.hint', { number: highestNumber })
                  : t('createDialog.hintFirst')}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                {t('createDialog.cancel')}
              </Button>
              <Button type="submit" disabled={submitting}>
                {isEdit ? t('editDialog.submit') : t('createDialog.submit')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
