'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { TABLE_SHAPES } from '../schemas';

const FormSchema = z.object({
  label: z.string().max(50),
  shape: z.enum(TABLE_SHAPES),
  capacity: z.number().int().min(1).max(100),
});

type FormValues = z.infer<typeof FormSchema>;

interface CreateTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (formData: FormData) => void;
  nextTableNumber: number;
  isPending?: boolean;
}

export function CreateTableDialog({
  open,
  onOpenChange,
  onCreate,
  nextTableNumber,
  isPending,
}: CreateTableDialogProps) {
  const t = useTranslations('seating');
  const tCommon = useTranslations('common');

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { label: '', shape: 'round', capacity: 8 },
  });

  const onSubmit = (values: FormValues) => {
    const fd = new FormData();
    fd.append('label', values.label);
    fd.append('shape', values.shape);
    fd.append('capacity', String(values.capacity));
    onOpenChange(false);
    form.reset();
    onCreate(fd);
  };

  const handleClose = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('createDialog.title')}</DialogTitle>
          <DialogDescription>{t('createDialog.description')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                        number: nextTableNumber,
                      })}
                      autoFocus
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
                          htmlFor={`shape-${shape}`}
                          className={cn(
                            'flex flex-col items-center gap-2 rounded-md border p-3 cursor-pointer hover:bg-accent transition-colors',
                            field.value === shape && 'border-primary bg-accent',
                          )}
                        >
                          <RadioGroupItem id={`shape-${shape}`} value={shape} className="sr-only" />
                          <ShapePreview shape={shape} />
                          <span className="text-xs">{t(`shapes.${shape}`)}</span>
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                {tCommon('cancel')}
              </Button>
              <Button type="submit" disabled={isPending}>
                {t('createDialog.submit')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ShapePreview({ shape }: { shape: (typeof TABLE_SHAPES)[number] }) {
  return (
    <div
      className={cn(
        'border-2 border-foreground/60 bg-background',
        shape === 'round' && 'h-10 w-10 rounded-full',
        shape === 'square' && 'h-10 w-10 rounded-sm',
        shape === 'rectangle' && 'h-6 w-12 rounded-sm',
      )}
    />
  );
}
