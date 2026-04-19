'use client';

import * as React from 'react';
import { useActionState, startTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { toast } from 'sonner';
import { upsertGuest, type UpsertGuestState } from '@/features/guests/actions';
import {
  type GuestUpsert,
  GuestUpsertSchema,
  GuestApp,
  GroupApp,
} from '@/features/guests/schemas';
import { GroupIcon } from './groups';
import {
  IconAddressBook,
  IconCheck,
  IconLayoutList,
  IconMinus,
  IconNote,
  IconPlus,
  IconToolsKitchen,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { DIETARY_PRESETS } from '@/features/guests/utils';

interface GuestFormProps {
  eventId: string;
  guest?: GuestApp | null;
  groups?: GroupApp[];
  onSuccess?: () => void;
  onCancel?: () => void;
  formId?: string;
  hideActions?: boolean;
  onPendingChange?: (pending: boolean) => void;
  showDietary?: boolean;
}

export function GuestForm({
  eventId,
  guest,
  groups = [],
  onSuccess,
  onCancel,
  formId = 'guest-form',
  hideActions = false,
  onPendingChange,
  showDietary = false,
}: GuestFormProps) {
  const t = useTranslations('guests');
  const tCommon = useTranslations('common');
  const isEditMode = !!guest;

  const dietaryLabels: Record<string, string> = {
    vegan: t('dietary.vegan'),
    vegetarian: t('dietary.vegetarian'),
    glatt: t('dietary.glatt'),
    'gluten-free': t('dietary.glutenFree'),
  };

  const form = useForm({
    resolver: zodResolver(GuestUpsertSchema),
    defaultValues: {
      name: guest?.name || '',
      phone: guest?.phone || '',
      groupId: guest?.groupId ?? null,
      rsvpStatus:
        (guest?.rsvpStatus as 'pending' | 'confirmed' | 'declined') ||
        'pending',
      dietaryRestrictions: guest?.dietaryRestrictions || '',
      amount: guest?.amount || 1,
      notes: guest?.notes || '',
    },
  });

  React.useEffect(() => {
    if (guest) {
      form.reset({
        name: guest.name || '',
        phone: guest.phone || '',
        groupId: guest.groupId ?? null,
        rsvpStatus:
          (guest.rsvpStatus as 'pending' | 'confirmed' | 'declined') ||
          'pending',
        dietaryRestrictions: guest.dietaryRestrictions || '',
        amount: guest.amount || 1,
        notes: guest.notes || '',
      });
    }
  }, [guest, form]);

  const [, formAction, isPending] = useActionState(
    async (
      _prevState: UpsertGuestState | null,
      formData: FormData,
    ): Promise<UpsertGuestState | null> => {
      const promise = upsertGuest(eventId, formData).then((result) => {
        if (!result.success) {
          throw new Error(result.message || 'Operation failed.');
        }
        return result;
      });

      toast.promise(promise, {
        loading: isEditMode ? t('form.updatingGuest') : t('form.addingGuest'),
        success: (data) => {
          if (!isEditMode) {
            form.reset();
          }
          return data.message || (isEditMode ? t('form.guestUpdated') : t('form.guestAdded'));
        },
        error: (err) =>
          err instanceof Error ? err.message : t('form.somethingWentWrong'),
      });

      try {
        return await promise;
      } catch {
        return null;
      }
    },
    null,
  );

  React.useEffect(() => {
    onPendingChange?.(isPending);
  }, [isPending, onPendingChange]);

  const onSubmit = (values: GuestUpsert) => {
    const formData = new FormData();

    if (isEditMode && guest?.id) {
      formData.append('id', guest.id);
    }

    Object.entries(values).forEach(([key, value]) => {
      if (key === 'groupId') {
        formData.append(key, value ? String(value) : 'null');
        return;
      }
      if (key === 'dietaryRestrictions' || key === 'notes') {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
        return;
      }
      if (value !== undefined && value !== null && value !== '') {
        formData.append(key, String(value));
      }
    });

    onSuccess?.();

    startTransition(() => {
      formAction(formData);
    });
  };

  const rawDietary = form.watch('dietaryRestrictions') || '';
  const selectedChips = rawDietary
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean);
  const amountValue = form.watch('amount') || 1;

  const toggleChip = (chip: string) => {
    const next = selectedChips.includes(chip) ? '' : chip;
    form.setValue('dietaryRestrictions', next, { shouldDirty: true });
  };

  return (
    <Form {...form}>
      <form
        id={formId}
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
      >
        {/* Contact Information */}
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <IconAddressBook size={16} className="text-muted-foreground" />
            {t('form.contactInfo')}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.name')}</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder={t('form.namePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.phone')}</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder={t('form.phonePlaceholder')}
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="amount"
            render={() => (
              <FormItem>
                <FormLabel>{t('form.amount')}</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-9 shrink-0"
                      onClick={() =>
                        form.setValue(
                          'amount',
                          Math.max(1, amountValue - 1),
                          { shouldDirty: true },
                        )
                      }
                    >
                      <IconMinus size={16} />
                    </Button>
                    <div className="flex-1 text-center">
                      <span className="text-lg font-semibold">
                        {amountValue}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {amountValue === 1 ? t('form.person') : t('form.people')}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-9 shrink-0"
                      onClick={() =>
                        form.setValue('amount', amountValue + 1, {
                          shouldDirty: true,
                        })
                      }
                    >
                      <IconPlus size={16} />
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Event Details */}
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <IconLayoutList size={16} className="text-muted-foreground" />
            {t('form.eventDetails')}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="rsvpStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.rsvpStatus')}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('form.rsvpPlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">{t('rsvp.pending')}</SelectItem>
                      <SelectItem value="confirmed">{t('rsvp.confirmed')}</SelectItem>
                      <SelectItem value="declined">{t('rsvp.declined')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="groupId"
              render={({ field }) => {
                const selectedGroup = groups.find((g) => g.id === field.value);
                return (
                  <FormItem>
                    <FormLabel>{t('form.group')}</FormLabel>
                    <Select
                      value={field.value || 'none'}
                      onValueChange={(value) =>
                        field.onChange(value === 'none' ? null : value)
                      }
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t('form.groupPlaceholder')}>
                            {selectedGroup ? (
                              <span className="flex items-center gap-2">
                                <GroupIcon
                                  iconName={selectedGroup.icon}
                                  size="sm"
                                />
                                {selectedGroup.name}
                              </span>
                            ) : (
                              t('form.noGroup')
                            )}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">{t('form.noGroup')}</SelectItem>
                        {groups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            <span className="flex items-center gap-2">
                              <GroupIcon iconName={group.icon} size="sm" />
                              {group.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          </div>
        </div>

        {/* Dietary Restrictions */}
        {showDietary && (
          <div className="rounded-lg border bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <IconToolsKitchen size={16} className="text-muted-foreground" />
              {t('form.dietaryRestrictions')}
            </h3>
            <FormField
              control={form.control}
              name="dietaryRestrictions"
              render={() => (
                <FormItem>
                  <FormControl>
                    <div className="flex flex-wrap gap-2">
                      {DIETARY_PRESETS.map((preset) => {
                        const isActive = selectedChips.includes(preset.value);
                        return (
                          <button
                            key={preset.value}
                            type="button"
                            onClick={() => toggleChip(preset.value)}
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                              isActive
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80',
                            )}
                          >
                            {isActive && <IconCheck size={12} />}
                            {dietaryLabels[preset.value] ?? preset.label}
                          </button>
                        );
                      })}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Notes */}
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <IconNote size={16} className="text-muted-foreground" />
            {t('form.notes')}
          </h3>
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    placeholder={t('form.notesPlaceholder')}
                    className="min-h-[100px]"
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {!hideActions && (
          <div className="flex gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending
                ? isEditMode
                  ? t('form.updating')
                  : t('form.adding')
                : isEditMode
                  ? t('form.updateGuest')
                  : t('form.addGuest')}
            </Button>
            {isEditMode && (
              <Button type="button" variant="secondary" onClick={onCancel}>
                {tCommon('cancel')}
              </Button>
            )}
          </div>
        )}
      </form>
    </Form>
  );
}
