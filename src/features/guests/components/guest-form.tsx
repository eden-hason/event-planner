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
  FormDescription,
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
  israeliMobilePhoneSchema,
  GuestApp,
  GroupApp,
  GROUP_SIDES,
} from '@/features/guests/schemas';
import { GroupIcon } from './groups';
import { GuestTableCombobox } from './guest-table-combobox';
import type { TableOption } from '@/features/seating';
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
import {
  DIETARY_PRESETS,
  rsvpPresentation,
  RSVP_STATUSES,
} from '@/features/guests/utils';
import type { MealChoice } from '@/lib/meal-choices';
import {
  normalizeMealCounts,
  totalMeals,
  type MealCounts,
} from '@/features/confirmation';
import posthog from 'posthog-js';
import { formatPhone } from '@/lib/phone';
import { resolveAmounts } from '@/features/guests/utils/guest-amount';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';


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
  tables?: TableOption[];
  /**
   * `cards` (default) boxes each section; `sections` is the desktop drawer's
   * flat layout from the Guests Desktop design.
   */
  layout?: 'cards' | 'sections';
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
  tables = [],
  layout = 'cards',
}: GuestFormProps) {
  const t = useTranslations('guests');
  const isSections = layout === 'sections';
  // The drawer words its placeholders its own way.
  const placeholder = (
    key: 'namePlaceholder' | 'phonePlaceholder' | 'groupPlaceholder',
  ) => t(isSections ? `list.drawer.${key}` : `form.${key}`);
  const tCommon = useTranslations('common');
  const isEditMode = !!guest;

  // Typed against the shared vocabulary so a new meal option cannot ship
  // without a label here.
  const dietaryLabels: Record<MealChoice, string> = {
    vegan: t('dietary.vegan'),
    vegetarian: t('dietary.vegetarian'),
    strictly_kosher: t('dietary.strictlyKosher'),
    gluten_free: t('dietary.glutenFree'),
  };

  const formSchema = GuestUpsertSchema.extend({
    phone: israeliMobilePhoneSchema(t('form.phoneInvalid')),
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: guest?.name || '',
      // Shown the way the Owner writes it (054-1234567), not as the stored
      // E.164; the save path converts it back (AppToDbTransformerSchema).
      phone: formatPhone(guest?.phone),
      groupId: guest?.groupId ?? null,
      rsvpStatus:
        (guest?.rsvpStatus as 'pending' | 'confirmed' | 'declined') ||
        'pending',
      mealCounts: guest?.mealCounts ?? {},
      amount: guest?.amount || 1,
      invitedAmount: guest?.invitedAmount ?? guest?.amount ?? 1,
      notes: guest?.notes || '',
      side: guest?.side ?? null,
      tableId: guest?.tableId ?? null,
    },
  });

  React.useEffect(() => {
    if (guest) {
      form.reset({
        name: guest.name || '',
        phone: formatPhone(guest.phone),
        groupId: guest.groupId ?? null,
        rsvpStatus:
          (guest.rsvpStatus as 'pending' | 'confirmed' | 'declined') ||
          'pending',
        mealCounts: guest.mealCounts ?? {},
        amount: guest.amount || 1,
        invitedAmount: guest.invitedAmount ?? guest.amount ?? 1,
        notes: guest.notes || '',
        side: guest.side ?? null,
        tableId: guest.tableId ?? null,
      });
    }
  }, [guest, form]);

  // The seating capacity guard (ADR-0008) rejects an over-capacity Table
  // Assignment inside Postgres and raises a parseable message. `upsertGuest`
  // passes it through untranslated; turn it into the same shortfall sentence the
  // Seating Plan shows rather than exposing a bare guest-upsert database error.
  const describeUpsertError = React.useCallback(
    (raw: string): string => {
      if (raw.includes('seating_over_capacity')) {
        const read = (key: string) =>
          Number(new RegExp(`${key}=(-?\\d+)`).exec(raw)?.[1] ?? 0);
        return t('form.table.overCapacity', {
          party: read('party'),
          free: read('free'),
          shortfall: read('shortfall'),
        });
      }
      if (raw.includes('seating_table_not_found')) {
        return t('form.table.tableGone');
      }
      return raw;
    },
    [t],
  );

  const [, formAction, isPending] = useActionState(
    async (
      _prevState: UpsertGuestState | null,
      formData: FormData,
    ): Promise<UpsertGuestState | null> => {
      const promise = upsertGuest(eventId, formData).then((result) => {
        if (!result.success) {
          throw new Error(
            result.message
              ? describeUpsertError(result.message)
              : t('form.somethingWentWrong'),
          );
        }
        return result;
      });

      toast.promise(promise, {
        loading: isEditMode ? t('form.updatingGuest') : t('form.addingGuest'),
        success: () => {
          if (
            process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN &&
            process.env.NEXT_PUBLIC_POSTHOG_HOST
          ) {
            posthog.capture(isEditMode ? 'guest_updated' : 'guest_created', {
              event_id: eventId,
              party_size: Number(formData.get('amount')),
              rsvp_status: formData.get('rsvpStatus'),
              has_group: formData.get('groupId') !== 'null',
            });
          }
          if (!isEditMode) {
            form.reset();
          }
          return isEditMode ? t('form.guestUpdated') : t('form.guestAdded');
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

  const onSubmit = (submitted: GuestUpsert) => {
    const formData = new FormData();
    // The drawer keeps the invitation and the answer apart; the card layout has
    // one count and leaves the invitation to follow it on the server (ADR 0023).
    const { invitedAmount: _invited, ...rest } = submitted;
    const values: GuestUpsert = isSections
      ? {
          ...rest,
          ...resolveAmounts({
            rsvpStatus: submitted.rsvpStatus ?? 'pending',
            invited: _invited ?? 1,
            coming: submitted.amount ?? 1,
          }),
        }
      : rest;
    const savedAmount = values.amount ?? amountValue;

    if (isEditMode && guest?.id) {
      formData.append('id', guest.id);
    }

    Object.entries(values).forEach(([key, value]) => {
      if (key === 'groupId' || key === 'side' || key === 'tableId') {
        formData.append(key, value ? String(value) : 'null');
        return;
      }
      if (key === 'mealCounts') {
        // Trimmed to the amount on screen, so what is saved is what was shown.
        formData.append(key, JSON.stringify(normalizeMealCounts(mealCounts, { amount: savedAmount })));
        return;
      }
      if (key === 'notes') {
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

  const amountValue = form.watch('amount') || 1;
  // Special Meals never outnumber the Guests (see Special Meal), so a lowered
  // amount trims what is shown - and saved - rather than failing the save.
  const mealCounts = normalizeMealCounts(form.watch('mealCounts') ?? {}, {
    amount: amountValue,
  });
  const mealsLeft = amountValue - totalMeals(mealCounts);

  // Commit the trim when the amount drops, so raising it again does not quietly
  // bring back meals that were already shown as removed.
  React.useEffect(() => {
    const current = form.getValues('mealCounts') ?? {};
    const trimmed = normalizeMealCounts(current, { amount: amountValue });
    if (totalMeals(trimmed) !== totalMeals(current)) {
      form.setValue('mealCounts', trimmed, { shouldDirty: true });
    }
  }, [form, amountValue]);

  // A declined Guest Record has no Table Assignment (ADR-0008). The database
  // clears it on save whatever the form sends, so the field stays put and goes
  // disabled rather than showing a value that is about to stop being true.
  const rsvpValue = form.watch('rsvpStatus');
  const isDeclined = rsvpValue === 'declined';
  const isConfirmed = rsvpValue === 'confirmed';
  const invitedValue = form.watch('invitedAmount') || 1;
  const tableIdValue = form.watch('tableId');

  React.useEffect(() => {
    if (isDeclined && tableIdValue) {
      form.setValue('tableId', null, { shouldDirty: true });
    }
  }, [form, isDeclined, tableIdValue]);

  const setMealCount = (type: MealChoice, next: number) => {
    const updated: MealCounts = { ...mealCounts };
    if (next > 0) updated[type] = next;
    else delete updated[type];
    form.setValue('mealCounts', updated, { shouldDirty: true });
  };

  const nameField = (
    <FormField
      control={form.control}
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('form.name')}</FormLabel>
          <FormControl>
            <Input
              type="text"
              placeholder={placeholder('namePlaceholder')}
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const phoneField = (
    <FormField
      control={form.control}
      name="phone"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('form.phone')}</FormLabel>
          <FormControl>
            <Input
              type="tel"
              dir="ltr"
              placeholder={placeholder('phonePlaceholder')}
              className="rtl:text-right"
              {...field}
              value={field.value || ''}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  // The drawer's counts are plain number inputs rather than the stepper, which
  // needs a row of its own: "invited" sits beside group and side, "coming"
  // beside the Special Meals, per the design.
  const countField = (
    name: 'amount' | 'invitedAmount',
    label: string,
    disabled = false,
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              disabled={disabled}
              // A record that is not coming has no answer to show.
              value={disabled ? '' : (field.value ?? 1)}
              placeholder="-"
              // Selected on focus, so typing replaces the count instead of
              // appending to it (an emptied field falls back to 1).
              onFocus={(event) => event.target.select()}
              onChange={(event) => {
                const next = Math.floor(Number(event.target.value));
                form.setValue(name, Number.isFinite(next) && next >= 1 ? next : 1, {
                  shouldDirty: true,
                });
              }}
              className="text-center tabular-nums"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const amountField = (
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
                  form.setValue('amount', Math.max(1, amountValue - 1), { shouldDirty: true })
                }
              >
                <IconMinus size={16} />
              </Button>
              <div className="flex-1 text-center">
                <span className="text-lg font-semibold">{amountValue}</span>
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
                  form.setValue('amount', amountValue + 1, { shouldDirty: true })
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
  );

  const rsvpField = (
    <FormField
      control={form.control}
      name="rsvpStatus"
      render={({ field }) => (
        <FormItem className={cn(!isSections && 'col-span-2')}>
          <FormLabel>{t('form.rsvpStatus')}</FormLabel>
          <FormControl>
            <div
              role="radiogroup"
              aria-label={t('form.rsvpStatus')}
              className={cn(
                'grid grid-cols-3',
                isSections
                  ? 'bg-muted h-9 gap-0.5 rounded-[10px] p-[3px]'
                  : 'overflow-hidden rounded-lg border bg-background',
              )}
            >
              {RSVP_STATUSES.map((option) => {
                const isSelected = field.value === option;
                return (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => field.onChange(option)}
                    className={cn(
                      'flex items-center justify-center gap-2 text-sm transition-colors focus-visible:ring-ring/50 focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-[3px]',
                      isSections
                        ? cn(
                            'rounded-[7px] text-[13px]',
                            isSelected
                              ? 'bg-card font-bold text-foreground shadow-[0_1px_3px_rgba(26,11,46,0.12)]'
                              : 'font-medium text-muted-foreground',
                          )
                        : cn(
                            'border-s px-3 py-2.5 first:border-s-0',
                            isSelected
                              ? 'bg-muted font-semibold text-foreground'
                              : 'text-muted-foreground hover:bg-muted/50',
                          ),
                    )}
                  >
                    <span
                      className={cn('size-2 shrink-0 rounded-full', rsvpPresentation(option).solid)}
                    />
                    {t(`rsvp.${option}` as 'rsvp.confirmed' | 'rsvp.declined' | 'rsvp.pending')}
                  </button>
                );
              })}
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const sideField = (
    <FormField
      control={form.control}
      name="side"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('form.side')}</FormLabel>
          {isSections ? (
            // The design's segmented control: only three answers, all visible.
            <FormControl>
              <div
                role="radiogroup"
                aria-label={t('form.side')}
                className="bg-muted flex h-9 gap-0.5 rounded-[10px] p-[3px]"
              >
                {([...GROUP_SIDES, null] as (typeof GROUP_SIDES[number] | null)[]).map((side) => {
                  const isSelected = (field.value ?? null) === side;
                  return (
                    <button
                      key={side ?? 'none'}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => field.onChange(side)}
                      className={cn(
                        'flex-1 rounded-[7px] text-[13px] whitespace-nowrap',
                        isSelected
                          ? 'bg-card font-bold text-foreground shadow-[0_1px_3px_rgba(26,11,46,0.12)]'
                          : 'font-medium text-muted-foreground',
                      )}
                    >
                      {t(`list.sides.${side ?? 'none'}` as 'list.sides.bride')}
                    </button>
                  );
                })}
              </div>
            </FormControl>
          ) : (
            <Select
              value={field.value ?? 'none'}
              onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('form.noSide')} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="none">{t('form.noSide')}</SelectItem>
                {GROUP_SIDES.map((side) => (
                  <SelectItem key={side} value={side}>
                    {t(`sides.${side}` as 'sides.bride' | 'sides.groom')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const groupField = (
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
              onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
            >
              <FormControl>
                {/* `min-w-0` down the chain so a long group name ellipsizes
                    instead of pushing into the side control beside it. */}
                <SelectTrigger className="w-full min-w-0 *:data-[slot=select-value]:min-w-0">
                  <SelectValue placeholder={placeholder('groupPlaceholder')}>
                    {selectedGroup ? (
                      <span className="flex min-w-0 items-center gap-2">
                        <GroupIcon iconName={selectedGroup.icon} size="sm" />
                        <span className="truncate">{selectedGroup.name}</span>
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
  );

  const tableField = (
    <FormField
      control={form.control}
      name="tableId"
      render={({ field }) => (
        <FormItem className="col-span-2">
          <FormLabel>{t('form.table.label')}</FormLabel>
          <GuestTableCombobox
            tables={tables}
            value={field.value ?? null}
            onChange={field.onChange}
            partyHeads={amountValue}
            originalTableId={guest?.tableId ?? null}
            originalPartyHeads={guest?.amount ?? 0}
            guestName={form.watch('name')}
            disabled={isDeclined}
          />
          {isDeclined && <FormDescription>{t('form.table.declinedHint')}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const mealsField = (
    <FormField
      control={form.control}
      name="mealCounts"
      render={() => (
        <FormItem>
          {isSections && <FormLabel>{t('form.dietaryRestrictions')}</FormLabel>}
          <FormControl>
            {amountValue === 1 ? (
              // One Guest: a choice, not a count.
              <div className="flex flex-wrap gap-2">
                {DIETARY_PRESETS.map((preset) => {
                  const isActive = Boolean(mealCounts[preset.value]);
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() =>
                        form.setValue('mealCounts', isActive ? {} : { [preset.value]: 1 }, {
                          shouldDirty: true,
                        })
                      }
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
            ) : (
              // Several Guests: how many of each type.
              <div className="divide-y rounded-md border">
                {DIETARY_PRESETS.map((preset) => {
                  const value = mealCounts[preset.value] ?? 0;
                  return (
                    <div key={preset.value} className="flex items-center gap-2 px-3 py-1.5">
                      <span className="flex-1 text-sm">
                        {dietaryLabels[preset.value] ?? preset.label}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        disabled={value <= 0}
                        onClick={() => setMealCount(preset.value, value - 1)}
                      >
                        <IconMinus size={14} />
                      </Button>
                      <span className="w-5 text-center text-sm font-semibold tabular-nums">
                        {value}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        disabled={mealsLeft <= 0}
                        onClick={() => setMealCount(preset.value, value + 1)}
                      >
                        <IconPlus size={14} />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const notesField = (
    <FormField
      control={form.control}
      name="notes"
      render={({ field }) => (
        <FormItem>
          {isSections && <FormLabel>{t('form.notes')}</FormLabel>}
          <FormControl>
            <Textarea
              placeholder={t('form.notesPlaceholder')}
              className={isSections ? 'min-h-[72px]' : 'min-h-[100px]'}
              {...field}
              value={field.value || ''}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  // The drawer's Special Meals: what is chosen, as chips, and one way to add or
  // adjust them. Bounded by how many are coming (see Special Meal).
  const chosenMeals = DIETARY_PRESETS.filter((preset) => (mealCounts[preset.value] ?? 0) > 0);
  const mealChipsField = (
    <FormItem>
      <FormLabel>{t('list.drawer.meals')}</FormLabel>
      <Popover>
        <PopoverTrigger asChild disabled={!isConfirmed}>
          <button
            type="button"
            className="border-input flex min-h-9 w-full flex-wrap items-center gap-[5px] rounded-[10px] border px-1.5 py-[5px] text-start outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {chosenMeals.length === 0 && (
              <span className="text-muted-foreground px-1.5 text-sm">{t('list.drawer.noMeals')}</span>
            )}
            {chosenMeals.map((preset) => (
              <span
                key={preset.value}
                className="bg-rsvp-confirmed-tint text-rsvp-confirmed-strong inline-flex h-[26px] items-center gap-[5px] rounded-[7px] px-[9px] text-[12.5px] font-semibold"
              >
                {dietaryLabels[preset.value] ?? preset.label}
                <span className="font-bold tabular-nums">×{mealCounts[preset.value]}</span>
              </span>
            ))}
            {isConfirmed && (
              <span className="text-primary ms-auto inline-flex h-[26px] items-center gap-1 rounded-[7px] px-2 text-[12.5px] font-semibold">
                <IconPlus size={13} stroke={2.4} />
                {t('list.drawer.addMeal')}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-1.5">
          <div className="divide-y">
            {DIETARY_PRESETS.map((preset) => {
              const value = mealCounts[preset.value] ?? 0;
              return (
                <div key={preset.value} className="flex items-center gap-2 px-2 py-1.5">
                  <span className="flex-1 text-sm">{dietaryLabels[preset.value] ?? preset.label}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    disabled={value <= 0}
                    onClick={() => setMealCount(preset.value, value - 1)}
                  >
                    <IconMinus size={14} />
                  </Button>
                  <span className="w-5 text-center text-sm font-semibold tabular-nums">{value}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    disabled={mealsLeft <= 0}
                    onClick={() => setMealCount(preset.value, value + 1)}
                  >
                    <IconPlus size={14} />
                  </Button>
                </div>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </FormItem>
  );

  const actions = !hideActions && (
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
  );

  if (isSections) {
    const comingField = countField(
      'amount',
      t('list.drawer.coming'),
      !isConfirmed,
    );
    // The desktop drawer: flat sections under small muted titles, grouped the
    // way the Owner thinks about a record - who, invited how, answered what,
    // seated where.
    return (
      <Form {...form}>
        <form
          id={formId}
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-[18px] [&_[data-slot=form-item]]:gap-[5px] [&_[data-slot=form-label]]:text-xs [&_[data-slot=form-label]]:font-semibold [&_[data-slot=form-label]]:text-muted-foreground"
        >
          <FormSection title={t('list.drawerSections.contact')}>
            <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-2.5">
              {nameField}
              {phoneField}
            </div>
          </FormSection>
          <FormSection title={t('list.drawerSections.invitation')}>
            <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_78px] gap-2.5">
              {groupField}
              {sideField}
              {countField('invitedAmount', t('list.drawer.invited'))}
            </div>
          </FormSection>
          <FormSection title={t('list.drawerSections.rsvp')}>
            {/* "Coming" is the Guest's answer - only a confirmed record has one.
                With no Special Meals it shares the status row; otherwise it
                heads the meals row. */}
            {showDietary ? (
              <>
                {rsvpField}
                <div className="grid grid-cols-[78px_minmax(0,1fr)] gap-2.5">
                  {comingField}
                  {mealChipsField}
                </div>
              </>
            ) : (
              <div className="grid grid-cols-[minmax(0,1fr)_78px] gap-2.5">
                {rsvpField}
                {comingField}
              </div>
            )}
          </FormSection>
          <FormSection title={t('list.drawerSections.seating')}>
            {/* One row, per the design: a narrow table picker beside a one-line note. */}
            <div className="grid grid-cols-[78px_minmax(0,1fr)] gap-2.5">
              <FormField
                control={form.control}
                name="tableId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('form.table.label')}</FormLabel>
                    <GuestTableCombobox
                      compact
                      tables={tables}
                      value={field.value ?? null}
                      onChange={field.onChange}
                      partyHeads={isConfirmed ? amountValue : invitedValue}
                      originalTableId={guest?.tableId ?? null}
                      originalPartyHeads={guest?.amount ?? 0}
                      guestName={form.watch('name')}
                      disabled={isDeclined}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('form.notes')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('list.drawer.notesPlaceholder')}
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {/* The declined hint needs the full width, not the 78px column. */}
            {isDeclined && (
              <p className="text-muted-foreground text-xs">{t('form.table.declinedHint')}</p>
            )}
          </FormSection>
          {actions}
        </form>
      </Form>
    );
  }

  return (
    <Form {...form}>
      <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Contact Information */}
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <IconAddressBook size={16} className="text-muted-foreground" />
            {t('form.contactInfo')}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {nameField}
            {phoneField}
          </div>
          {amountField}
        </div>

        {/* Event Details */}
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <IconLayoutList size={16} className="text-muted-foreground" />
            {t('form.eventDetails')}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {rsvpField}
            {sideField}
            {groupField}
            {tableField}
          </div>
        </div>

        {/* Dietary Restrictions */}
        {showDietary && (
          <div className="rounded-lg border bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <IconToolsKitchen size={16} className="text-muted-foreground" />
              {t('form.dietaryRestrictions')}
            </h3>
            {mealsField}
          </div>
        )}

        {/* Notes */}
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <IconNote size={16} className="text-muted-foreground" />
            {t('form.notes')}
          </h3>
          {notesField}
        </div>

        {actions}
      </form>
    </Form>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-[9px]">
      <h3 className="text-muted-foreground text-xs font-bold tracking-[0.02em]">{title}</h3>
      {children}
    </section>
  );
}
