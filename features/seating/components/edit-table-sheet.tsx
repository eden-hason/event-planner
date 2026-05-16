'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Trash2, X } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
import { GroupIcon } from '@/features/guests/components/groups/group-icon';
import { TABLE_SHAPES } from '../schemas';
import { tableOccupancy } from '../utils/occupancy';
import type { TableWithGuestsApp } from '../types';

const FormSchema = z.object({
  label: z.string().max(50),
  shape: z.enum(TABLE_SHAPES),
  capacity: z.number().int().min(1).max(100),
});

type FormValues = z.infer<typeof FormSchema>;

interface EditTableSheetProps {
  table: TableWithGuestsApp | null;
  onOpenChange: (open: boolean) => void;
  onSave: (formData: FormData) => void;
  onDelete: () => void;
  onUnassignGuest: (guestId: string) => void;
  isPending?: boolean;
}

export function EditTableSheet({
  table,
  onOpenChange,
  onSave,
  onDelete,
  onUnassignGuest,
  isPending,
}: EditTableSheetProps) {
  const t = useTranslations('seating');
  const tCommon = useTranslations('common');
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!table) return;
    const onPointerDown = (e: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onOpenChange(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [table, onOpenChange]);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    values: table
      ? { label: table.label ?? '', shape: table.shape, capacity: table.capacity }
      : { label: '', shape: 'round', capacity: 8 },
  });

  const onSubmit = (values: FormValues) => {
    if (!table) return;
    const fd = new FormData();
    fd.append('id', table.id);
    fd.append('label', values.label);
    fd.append('shape', values.shape);
    fd.append('capacity', String(values.capacity));
    onSave(fd);
  };

  const occupancy = table ? tableOccupancy(table.capacity, table.guests) : null;

  return (
    <>
      <div
        ref={panelRef}
        className={cn(
          'absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex w-80 flex-col rounded-xl border bg-card shadow-xl',
          'max-h-[calc(100svh-8rem)]',
          'transition-all duration-200',
          table
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-2 opacity-0',
        )}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between border-b px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">{t('editSheet.title')}</h2>
            <p className="text-xs text-muted-foreground">{t('editSheet.description')}</p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="ms-2 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        {table ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <Form {...form}>
              <form
                id="edit-table-form"
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('fields.label')}{' '}
                        <span className="text-xs text-muted-foreground font-normal">
                          {t('fields.labelOptional')}
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t('fields.labelAutoPlaceholder', {
                            number: table.tableNumber,
                          })}
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
                    <FormItem>
                      <FormLabel>{t('fields.shape')}</FormLabel>
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                          className="grid grid-cols-3 gap-2"
                        >
                          {TABLE_SHAPES.map((shape) => (
                            <label
                              key={shape}
                              htmlFor={`edit-shape-${shape}`}
                              className={cn(
                                'flex flex-col items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-accent transition-colors text-xs',
                                field.value === shape && 'border-primary bg-accent',
                              )}
                            >
                              <RadioGroupItem id={`edit-shape-${shape}`} value={shape} className="sr-only" />
                              {t(`shapes.${shape}`)}
                            </label>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fields.capacity')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={field.value}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{t('editSheet.seatedHeading')}</h3>
                <span
                  className={cn(
                    'text-xs rounded-full px-2 py-0.5',
                    occupancy?.isOverCapacity
                      ? 'bg-destructive text-destructive-foreground'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {occupancy?.seatedHeadCount}/{table.capacity}
                </span>
              </div>
              {table.guests.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  {t('editSheet.empty')}
                </p>
              ) : (
                <ul className="space-y-1">
                  {table.guests.map((g) => (
                    <li
                      key={g.id}
                      className="flex items-center gap-2 rounded-md border bg-card px-2 py-1.5 text-sm"
                    >
                      {g.group?.icon ? (
                        <GroupIcon
                          iconName={g.group.icon}
                          size="sm"
                          className="text-muted-foreground shrink-0"
                        />
                      ) : null}
                      <span className="flex-1 truncate">{g.name}</span>
                      {g.amount > 1 ? (
                        <span className="text-xs text-muted-foreground">×{g.amount}</span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => onUnassignGuest(g.id)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                        aria-label={t('editSheet.unassign')}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}

        {/* Footer */}
        <div className="shrink-0 border-t p-2 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setConfirmDelete(true)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 me-1" />
            {t('actions.delete')}
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              {tCommon('cancel')}
            </Button>
            <Button type="submit" size="sm" form="edit-table-form" disabled={isPending}>
              {tCommon('save')}
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDelete(false);
                onDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
