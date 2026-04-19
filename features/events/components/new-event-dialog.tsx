'use client';

import * as React from 'react';
import { useActionState, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { IconPlus } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  EventCreateSchema,
  type EventCreate,
  type CreateEventState,
} from '../schemas';
import { createEvent } from '../actions';

interface NewEventDialogProps {
  children?: React.ReactNode;
  /** Controlled mode: use when dialog is rendered outside its trigger (e.g. in a dropdown) */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function NewEventDialog({
  children,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: NewEventDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled
    ? (value: boolean) => controlledOnOpenChange?.(value)
    : setInternalOpen;
  const router = useRouter();
  const t = useTranslations('newEventDialog');
  const tEventDetails = useTranslations('eventDetails.dateTime.types');

  const form = useForm({
    resolver: zodResolver(EventCreateSchema),
    defaultValues: {
      title: '',
      eventDate: '',
      eventType: 'wedding' as const,
    },
  });

  const createEventActionWithToast = async (
    _prevState: CreateEventState | null,
    formData: FormData,
  ): Promise<CreateEventState | null> => {
    const eventTitle = (formData.get('title') as string) || 'event';
    const promise = createEvent(formData).then((result) => {
      if (!result.success) {
        throw new Error(result.message || t('toast.failed'));
      }
      return result;
    });

    toast.promise(promise, {
      loading: t('toast.creating', { title: eventTitle }),
      success: (data) => {
        setOpen(false);
        form.reset();
        router.push(`/app/${data.eventId}/dashboard`);
        return data.message || t('toast.created');
      },
      error: (err) =>
        err instanceof Error ? err.message : t('toast.failed'),
    });

    try {
      return await promise;
    } catch {
      return null;
    }
  };

  const [, formAction, isPending] = useActionState(
    createEventActionWithToast,
    null as CreateEventState | null,
  );

  const onSubmit = (values: EventCreate) => {
    setOpen(false); // Close modal immediately on submit
    const formData = new FormData();
    formData.append('title', values.title);
    formData.append('eventDate', values.eventDate);
    formData.append('eventType', values.eventType);

    startTransition(() => {
      formAction(formData);
    });
  };

  const triggerButton = (
    <button
      type="button"
      className="flex w-full items-center gap-2 p-2"
      onClick={() => setOpen(true)}
    >
      <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
        <IconPlus size={16} />
      </div>
      <div className="text-muted-foreground font-medium">{t('newEvent')}</div>
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>{children ?? triggerButton}</DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('eventTitleLabel')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('eventTitlePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="eventDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('eventDateLabel')}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="eventType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('eventTypeLabel')}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('eventTypePlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="wedding">{tEventDetails('wedding')}</SelectItem>
                      <SelectItem value="birthday">{tEventDetails('birthday')}</SelectItem>
                      <SelectItem value="corporate">{tEventDetails('corporate')}</SelectItem>
                      <SelectItem value="other">{tEventDetails('other')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? t('creating') : t('create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
