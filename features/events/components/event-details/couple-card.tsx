'use client';

import { useForm, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useActionState, startTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { z } from 'zod';
import { Ampersand, Heart } from 'lucide-react';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  EventApp,
  EventDetailsUpdateSchema,
  UpdateEventDetailsState,
  WeddingHostDetails,
} from '../../schemas';
import { updateEventDetails } from '../../actions';

const CoupleCardSchema = EventDetailsUpdateSchema.pick({ id: true, hostDetails: true });
type CoupleCardValues = z.infer<typeof CoupleCardSchema>;

interface PersonPanelProps {
  roleLabel: string;
  initial: string;
  nameName: 'hostDetails.bride.name' | 'hostDetails.groom.name';
  parentsName: 'hostDetails.bride.parents' | 'hostDetails.groom.parents';
  nameLabel: string;
  namePlaceholder: string;
  parentsLabel: string;
  parentsPlaceholder: string;
}

function PersonPanel({
  roleLabel,
  initial,
  nameName,
  parentsName,
  nameLabel,
  namePlaceholder,
  parentsLabel,
  parentsPlaceholder,
}: PersonPanelProps) {
  const form = useFormContext<CoupleCardValues>();

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl bg-primary/5 p-4">
      <div className="flex flex-col items-center gap-1.5">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-lg font-semibold text-primary ring-2 ring-primary/20">
          {initial}
        </div>
        <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {roleLabel}
        </span>
      </div>

      <FormField
        control={form.control}
        name={nameName}
        render={({ field }) => (
          <FormItem className="w-full">
            <FormLabel className="sr-only">{nameLabel}</FormLabel>
            <FormControl>
              <Input placeholder={namePlaceholder} className="text-center" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="w-full space-y-1.5">
        <p className="text-center text-xs text-muted-foreground">{parentsLabel}</p>
        <FormField
          control={form.control}
          name={parentsName}
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel className="sr-only">{parentsLabel}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={parentsPlaceholder}
                  rows={2}
                  className="resize-none text-center text-sm"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

interface CoupleCardProps {
  event: EventApp;
}

export function CoupleCard({ event }: CoupleCardProps) {
  const t = useTranslations('eventDetails.couple');
  const tHeader = useTranslations('eventDetails.header');

  const hostDetails = event.hostDetails as WeddingHostDetails | undefined;

  const form = useForm<CoupleCardValues>({
    resolver: zodResolver(CoupleCardSchema),
    defaultValues: {
      id: event.id,
      hostDetails: {
        bride: {
          name: hostDetails?.bride?.name || '',
          parents: hostDetails?.bride?.parents || '',
        },
        groom: {
          name: hostDetails?.groom?.name || '',
          parents: hostDetails?.groom?.parents || '',
        },
      },
    },
  });

  const isDirty = form.formState.isDirty;

  const brideName = form.watch('hostDetails.bride.name');
  const groomName = form.watch('hostDetails.groom.name');

  const brideInitial = brideName?.[0]?.toUpperCase() || '♀';
  const groomInitial = groomName?.[0]?.toUpperCase() || '♂';

  const [, formAction, isPending] = useActionState(
    async (_prev: UpdateEventDetailsState | null, formData: FormData) => {
      try {
        const result = await updateEventDetails(formData);
        if (result.success) {
          toast.success(result.message);
          form.reset(form.getValues());
        } else {
          toast.error(result.message);
        }
        return result;
      } catch {
        toast.error('Something went wrong');
        return null;
      }
    },
    null,
  );

  const onSubmit = (values: CoupleCardValues) => {
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object') formData.append(key, JSON.stringify(value));
        else formData.append(key, String(value));
      }
    });
    startTransition(() => formAction(formData));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Heart className="size-4 shrink-0 fill-primary/30 text-primary" />
              <CardTitle className="text-xl font-bold">{t('title')}</CardTitle>
            </div>
            {isDirty && (
              <CardAction className="animate-in fade-in-0 zoom-in-95 duration-200">
                <Button type="submit" size="sm" disabled={isPending}>
                  <IconDeviceFloppy className="size-4" />
                  {isPending ? tHeader('saving') : tHeader('save')}
                </Button>
              </CardAction>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[1fr_40px_1fr] items-start gap-2">
              <PersonPanel
                roleLabel={t('bride')}
                initial={brideInitial}
                nameName="hostDetails.bride.name"
                parentsName="hostDetails.bride.parents"
                nameLabel={t('brideName')}
                namePlaceholder={t('brideNamePlaceholder')}
                parentsLabel={t('brideSide')}
                parentsPlaceholder={t('brideSidePlaceholder')}
              />

              <div className="flex flex-col items-center gap-1 self-stretch py-6">
                <div className="w-px flex-1 bg-gradient-to-b from-transparent via-border to-border" />
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-card text-primary">
                  <Ampersand className="size-4" />
                </div>
                <div className="w-px flex-1 bg-gradient-to-b from-border via-border to-transparent" />
              </div>

              <PersonPanel
                roleLabel={t('groom')}
                initial={groomInitial}
                nameName="hostDetails.groom.name"
                parentsName="hostDetails.groom.parents"
                nameLabel={t('groomName')}
                namePlaceholder={t('groomNamePlaceholder')}
                parentsLabel={t('groomSide')}
                parentsPlaceholder={t('groomSidePlaceholder')}
              />
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
