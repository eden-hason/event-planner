'use client';

import { useForm, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useActionState, startTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { z } from 'zod';
import { Ampersand } from 'lucide-react';
import { CoupleCardIcon } from '@/components/icons/couple-card-icon';
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
  EventHostDetails,
  UpdateEventDetailsState,
  isCoupleEvent,
  type EventTypeKey,
} from '../../schemas';
import { updateEventDetails } from '../../actions';

const HostsCardSchema = EventDetailsUpdateSchema.pick({ id: true, hostDetails: true });
type HostsCardValues = z.infer<typeof HostsCardSchema>;

type HostRole = 'bride' | 'groom' | 'child';

interface PersonPanelProps {
  roleLabel: string;
  initial: string;
  nameName: `hostDetails.${HostRole}.name`;
  parentsName: `hostDetails.${HostRole}.parents`;
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
  const form = useFormContext<HostsCardValues>();

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

interface HostsCardProps {
  event: EventApp;
}

/**
 * The people the event is named after, shaped by its type: a wedding or henna
 * has a bride and a groom, a mitzva has the one child celebrating - the same
 * split the onboarding names screen makes. A bat mitzva takes the feminine
 * copy, which matters in Hebrew.
 */
export function HostsCard({ event }: HostsCardProps) {
  const t = useTranslations('eventDetails.couple');
  const tHeader = useTranslations('eventDetails.header');
  const tToast = useTranslations('eventDetails.toast');

  const eventType = event.eventType as EventTypeKey | undefined;
  const couple = !eventType || isCoupleEvent(eventType);
  const female = eventType === 'bat_mitzva';

  const hostDetails = event.hostDetails as EventHostDetails | undefined;
  const personDefaults = (role: HostRole) => ({
    name: hostDetails?.[role]?.name || '',
    parents: hostDetails?.[role]?.parents || '',
  });

  const form = useForm<HostsCardValues>({
    resolver: zodResolver(HostsCardSchema),
    defaultValues: {
      id: event.id,
      hostDetails: couple
        ? { bride: personDefaults('bride'), groom: personDefaults('groom') }
        : { child: personDefaults('child') },
    },
  });

  const isDirty = form.formState.isDirty;

  const brideName = form.watch('hostDetails.bride.name');
  const groomName = form.watch('hostDetails.groom.name');
  const childName = form.watch('hostDetails.child.name');

  const brideInitial = brideName?.[0]?.toUpperCase() || '♀';
  const groomInitial = groomName?.[0]?.toUpperCase() || '♂';
  const childInitial = childName?.[0]?.toUpperCase() || (female ? '♀' : '♂');

  const [, formAction, isPending] = useActionState(
    async (_prev: UpdateEventDetailsState | null, formData: FormData) => {
      try {
        const result = await updateEventDetails(formData);
        if (result.success) {
          toast.success(tToast('saved'));
          form.reset(form.getValues());
        } else {
          toast.error(result.message);
        }
        return result;
      } catch {
        toast.error(tToast('error'));
        return null;
      }
    },
    null,
  );

  const onSubmit = (values: HostsCardValues) => {
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
              <CoupleCardIcon className="size-4 shrink-0 text-primary" />
              <CardTitle className="text-xl font-bold">
                {couple ? t('title') : female ? t('titleSingleFemale') : t('titleSingleMale')}
              </CardTitle>
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
            {couple ? (
              <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-[1fr_40px_1fr]">
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

                {/*
                  The divider runs between the two panels, so it turns with them:
                  a horizontal rule above the groom panel once the grid stacks on
                  mobile, the vertical column it has always been from `sm` up.
                  Below `sm` both halves fade out at both ends instead of into
                  the panel beside them - which end is the "outer" one flips in
                  RTL, and a symmetric fade reads the same either way.
                */}
                <div className="flex items-center gap-2 self-stretch py-1 sm:flex-col sm:gap-1 sm:py-6">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent sm:h-auto sm:w-px sm:bg-gradient-to-b sm:to-border" />
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-card text-primary">
                    <Ampersand className="size-4" />
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent sm:h-auto sm:w-px sm:bg-gradient-to-b sm:from-border" />
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
            ) : (
              <div className="mx-auto max-w-sm">
                <PersonPanel
                  roleLabel={female ? t('celebrantFemale') : t('celebrantMale')}
                  initial={childInitial}
                  nameName="hostDetails.child.name"
                  parentsName="hostDetails.child.parents"
                  nameLabel={female ? t('celebrantNameFemale') : t('celebrantNameMale')}
                  namePlaceholder={
                    female ? t('celebrantNamePlaceholderFemale') : t('celebrantNamePlaceholderMale')
                  }
                  parentsLabel={t('parentsNames')}
                  parentsPlaceholder={t('parentsPlaceholder')}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
