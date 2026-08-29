'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
  TableBatchCreateSchema,
  type TableBatchCreate,
} from '../schemas';
import { ShapePicker } from './shape-picker';
import { useSeatingCopy } from './use-seating-copy';

interface BatchCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Numbers already in use, so the preview can promise the range is free. */
  usedNumbers: number[];
  nextNumber: number;
  error: string | null;
  isPending: boolean;
  onSubmit: (values: TableBatchCreate) => void;
}

const QUANTITY_DEFAULT = 12;

/**
 * Batch creation, for setting up the whole room at once.
 *
 * Atomic by decision (ADR-0008): if any number in the range is taken, none of
 * the batch is created. So the range is checked as it is typed and the conflict
 * named before the planner commits, rather than reported afterwards.
 *
 * React Hook Form + the shared `TableBatchCreateSchema` handle the numeric
 * bounds and the "range runs past the maximum" rule. The one thing the schema
 * cannot know - which numbers are already in use in this Event - stays here as a
 * live conflict check that blocks the submit.
 */
export function BatchCreateDialog({
  open,
  onOpenChange,
  usedNumbers,
  nextNumber,
  error,
  isPending,
  onSubmit,
}: BatchCreateDialogProps) {
  const { t } = useSeatingCopy();

  const defaults = React.useCallback(
    (): TableBatchCreate => ({
      quantity: QUANTITY_DEFAULT,
      startNumber: nextNumber,
      capacity: DEFAULT_CAPACITY,
      shape: 'round',
    }),
    [nextNumber],
  );

  const form = useForm({
    resolver: zodResolver(TableBatchCreateSchema),
    defaultValues: defaults(),
  });

  React.useEffect(() => {
    if (open) form.reset(defaults());
  }, [open, defaults, form]);

  const quantity = form.watch('quantity');
  const startNumber = form.watch('startNumber');
  const capacity = form.watch('capacity');
  const shape = form.watch('shape');

  const safeQuantity = Number.isFinite(quantity) ? quantity : 0;
  const safeStart = Number.isFinite(startNumber) ? startNumber : 0;
  const lastNumber = safeStart + Math.max(safeQuantity, 1) - 1;

  const clashes = React.useMemo(() => {
    const used = new Set(usedNumbers);
    return Array.from({ length: Math.max(safeQuantity, 0) }, (_, i) => safeStart + i).filter(
      (n) => used.has(n),
    );
  }, [safeQuantity, safeStart, usedNumbers]);

  // Past the highest number in the whole conflicting range, so the suggestion is
  // one the planner can actually take.
  const suggestion =
    clashes.length > 0 ? Math.max(...usedNumbers, 0) + 1 : safeStart;

  const submitting = isPending || form.formState.isSubmitting;
  const blocked = submitting || clashes.length > 0;

  const previewInvalid =
    !Number.isFinite(capacity) ||
    capacity < MIN_CAPACITY ||
    capacity > MAX_CAPACITY ||
    safeQuantity < 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('batchDialog.title')}</DialogTitle>
          <DialogDescription>
            {clashes.length > 0
              ? t('batchDialog.conflictDescription')
              : t('batchDialog.description')}
          </DialogDescription>
        </DialogHeader>

        {(error || clashes.length > 0) && (
          <div className="border-destructive/40 bg-destructive/5 flex items-start gap-2 rounded-lg border p-3">
            <TriangleAlert className="text-destructive mt-0.5 size-4 shrink-0" />
            <p className="text-sm">
              {error ??
                (clashes.length === 1
                  ? t('batchDialog.conflictOne', {
                      numbers: clashes[0],
                      suggestion,
                    })
                  : t('batchDialog.conflict', {
                      numbers: clashes.join(', '),
                      suggestion,
                    }))}
            </p>
          </div>
        )}

        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) => onSubmit(values))}
          >
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>{t('batchDialog.quantity')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={100}
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
                name="startNumber"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>{t('batchDialog.startNumber')}</FormLabel>
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
            </div>

            <FormField
              control={form.control}
              name="capacity"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel>{t('batchDialog.seats')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={MIN_CAPACITY}
                      max={MAX_CAPACITY}
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
              name="shape"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <Label>{t('batchDialog.shape')}</Label>
                  <ShapePicker value={field.value} onChange={field.onChange} />
                  <p className="text-muted-foreground text-xs">
                    {t('batchDialog.shapeHint')}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-muted/50 space-y-1 rounded-lg p-3">
              <p className="text-muted-foreground text-xs font-medium">
                {t('batchDialog.preview')}
              </p>
              <p className="text-sm">
                {safeQuantity === 1
                  ? t('batchDialog.previewOne', {
                      from: safeStart,
                      shape: t(`shapes.${shape}`),
                      seats: Number.isFinite(capacity) ? capacity : 0,
                    })
                  : t('batchDialog.previewRange', {
                      from: safeStart,
                      to: lastNumber,
                      shape: t(`shapes.${shape}`),
                      seats: Number.isFinite(capacity) ? capacity : 0,
                    })}
              </p>
              {clashes.length === 0 && !previewInvalid && (
                <p className="text-muted-foreground text-xs">
                  {t('batchDialog.previewPlaces', {
                    places: safeQuantity * capacity,
                  })}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                {t('batchDialog.cancel')}
              </Button>
              <Button type="submit" disabled={blocked}>
                {t('batchDialog.submit', { count: Math.max(safeQuantity, 0) })}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
