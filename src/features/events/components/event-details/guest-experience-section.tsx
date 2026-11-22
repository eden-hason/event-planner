'use client';

import { useFormContext } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { MessageSquareText, RotateCcw } from 'lucide-react';
import { Switch } from '@/components/ui/toggle-switch';
import { FormControl, FormField } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { MealChoice } from '@/lib/meal-choices';
import type { EventDetailsFormValues } from '../../schemas';
import {
  KULULU_TRANSPORTATION_WORDING,
  ownerTransportationWording,
  TRANSPORTATION_WORDING_MAX_LENGTH,
  validateTransportationGroupUrl,
} from '../../utils/transportation-question';
import { SECTION_IDS } from './event-details-context';
import { SectionCard } from './section-card';

const MEAL_OPTIONS: readonly { value: MealChoice; labelKey: string }[] = [
  { value: 'vegetarian', labelKey: 'meal.vegetarian' },
  { value: 'vegan', labelKey: 'meal.vegan' },
  { value: 'gluten_free', labelKey: 'meal.glutenFree' },
  { value: 'strictly_kosher', labelKey: 'meal.strictlyKosher' },
];

/**
 * The switches that change what a Guest is asked or told.
 *
 * None of them touch what the product can do - seating works whether or not
 * table numbers are sent, and the RSVP conversation runs without the meal
 * question - so each description says what changes in the conversation rather
 * than what the setting is called.
 */
type ToggleName =
  | 'guestExperience.dietaryOptions'
  | 'guestExperience.lockGuestCount'
  | 'guestExperience.sendTableNumbers'
  | 'guestExperience.askTransportation';

/** One setting: what it is, what it changes for a Guest, and its switch. */
function ToggleRow({
  name,
  title,
  description,
}: {
  name: ToggleName;
  title: string;
  description: string;
}) {
  const form = useFormContext<EventDetailsFormValues>();

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <div className="flex items-start gap-3 lg:items-center lg:gap-3.5">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-sm font-bold lg:text-[14.5px]">{title}</span>
            <span className="text-muted-foreground text-xs leading-snug lg:text-[12.5px]">
              {description}
            </span>
          </div>
          <FormControl>
            <Switch
              switchSize="lg"
              aria-label={title}
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          </FormControl>
        </div>
      )}
    />
  );
}

/**
 * The Transportation Question's Question Wording and Transportation Group,
 * inside the setting they belong to and only while it is on. Both are kept when
 * the question is switched off, so turning it back on finds them as they were.
 *
 * The wording starts on Kululu's, so a small change is an edit rather than a
 * retype; what is stored is decided on save (ownerTransportationWording).
 */
function TransportationDetails() {
  const t = useTranslations('eventDetails.guestExperience');
  const form = useFormContext<EventDetailsFormValues>();
  const labelClasses = 'text-muted-foreground text-xs font-bold lg:text-[12.5px]';
  const hintClasses = 'text-muted-foreground text-xs leading-snug';

  return (
    <div className="border-primary/15 bg-primary/5 animate-in fade-in-0 slide-in-from-top-1 flex flex-col gap-3.5 rounded-xl border p-[11px] duration-200 lg:p-3">
      <FormField
        control={form.control}
        name="guestExperience.transportationWording"
        render={({ field, fieldState }) => {
          const edited = ownerTransportationWording(field.value) !== null;
          return (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="transportation-wording" className={labelClasses}>
                  {t('transportationWording')}
                </label>
                {edited && (
                  <button
                    type="button"
                    onClick={() =>
                      field.onChange(KULULU_TRANSPORTATION_WORDING)
                    }
                    className="text-primary focus-visible:ring-ring/50 inline-flex items-center gap-1 rounded text-xs font-semibold outline-none focus-visible:ring-[3px]"
                  >
                    <RotateCcw className="size-3" />
                    {t('transportationWordingReset')}
                  </button>
                )}
              </div>
              <FormControl>
                <Textarea
                  id="transportation-wording"
                  // The Guest reads it in Hebrew; an Owner's own wording keeps
                  // whatever direction it was typed in.
                  dir="auto"
                  rows={2}
                  maxLength={TRANSPORTATION_WORDING_MAX_LENGTH}
                  className="bg-card min-h-0 resize-none"
                  {...field}
                />
              </FormControl>
              <span className={cn(hintClasses, fieldState.error && 'text-destructive')}>
                {fieldState.error
                  ? t('transportationWordingTooLong', { max: TRANSPORTATION_WORDING_MAX_LENGTH })
                  : t('transportationWordingHint')}
              </span>
            </div>
          );
        }}
      />

      <FormField
        control={form.control}
        name="guestExperience.transportationGroupUrl"
        render={({ field, fieldState }) => {
          const error = fieldState.error ? validateTransportationGroupUrl(field.value) : null;
          return (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="transportation-group" className={labelClasses}>
                {t('transportationGroup')}
              </label>
              <FormControl>
                <Input
                  id="transportation-group"
                  // Text, not url: the browser's own check would refuse the save
                  // before ours could say why.
                  type="text"
                  inputMode="url"
                  dir="ltr"
                  autoComplete="off"
                  placeholder="https://chat.whatsapp.com/..."
                  className="bg-card"
                  {...field}
                />
              </FormControl>
              <span className={cn(hintClasses, error && 'text-destructive')}>
                {error ? t(`transportationGroupError.${error}`) : t('transportationGroupHint')}
              </span>
            </div>
          );
        }}
      />
    </div>
  );
}

/**
 * The switches that change what a Guest is asked or told.
 *
 * None of them touch what the product can do - seating works whether or not
 * table numbers are sent, and the RSVP conversation runs without the meal
 * question - so each description says what changes in the conversation rather
 * than what the setting is called.
 */
export function GuestExperienceSection() {
  const t = useTranslations('eventDetails.guestExperience');
  const form = useFormContext<EventDetailsFormValues>();

  const mealsEnabled = form.watch('guestExperience.dietaryOptions');
  const transportationEnabled = form.watch('guestExperience.askTransportation');

  const rowClasses = 'border-t py-[11px] lg:py-[13px]';

  return (
    <SectionCard
      id={SECTION_IDS.experience}
      icon={<MessageSquareText className="text-success" />}
      title={t('title')}
      className="gap-1.5 lg:gap-1"
      contentClassName="pt-1.5 lg:pt-2"
    >
      <div className={rowClasses}>
        <ToggleRow
          name="guestExperience.sendTableNumbers"
          title={t('sendTableNumbers')}
          description={t('sendTableNumbersDescription')}
        />
      </div>

      <div className={cn('flex flex-col gap-2.5 lg:gap-3', rowClasses)}>
        <ToggleRow
          name="guestExperience.dietaryOptions"
          title={t('specialMeal')}
          description={t('specialMealDescription')}
        />

        {/*
          Which meals to offer lives inside the setting it belongs to, and only
          while that setting is on. Every option is visible as a chip - four is
          few enough that a dropdown only hides the answer.
        */}
        {mealsEnabled && (
          <FormField
            control={form.control}
            name="guestExperience.dietaryTypes"
            render={({ field }) => {
              const selected = field.value;

              const toggleMeal = (value: string) => {
                field.onChange(
                  selected.includes(value)
                    ? selected.filter((item) => item !== value)
                    : [...selected, value],
                );
              };

              return (
                <div className="border-primary/15 bg-primary/5 animate-in fade-in-0 slide-in-from-top-1 flex flex-col gap-2.5 rounded-xl border p-[11px] duration-200 lg:flex-row lg:items-center lg:gap-3 lg:p-3">
                  <span className="text-muted-foreground shrink-0 text-xs font-bold lg:text-[12.5px]">
                    {t('mealsLabel')}
                  </span>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex flex-wrap gap-[7px]" role="group" aria-label={t('mealsLabel')}>
                      {MEAL_OPTIONS.map((meal) => {
                        const on = selected.includes(meal.value);
                        return (
                          <button
                            key={meal.value}
                            type="button"
                            aria-pressed={on}
                            onClick={() => toggleMeal(meal.value)}
                            className={cn(
                              // Same border, weight and content in both states, so
                              // picking a meal recolours the chip without resizing it.
                              'focus-visible:ring-ring/50 inline-flex items-center rounded-full border px-2.5 py-1.5 text-[12.5px] font-semibold transition-colors outline-none focus-visible:ring-[3px] lg:px-[11px]',
                              on
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'bg-card text-muted-foreground hover:text-foreground',
                            )}
                          >
                            {t(meal.labelKey)}
                          </button>
                        );
                      })}
                    </div>
                    {selected.length === 0 && (
                      <span className="text-warning-ink text-xs">{t('mealsEmpty')}</span>
                    )}
                  </div>
                </div>
              );
            }}
          />
        )}
      </div>

      <div className={rowClasses}>
        <ToggleRow
          name="guestExperience.lockGuestCount"
          title={t('lockGuestCount')}
          description={t('lockGuestCountDescription')}
        />
      </div>

      <div className={cn('flex flex-col gap-2.5 lg:gap-3', rowClasses)}>
        <ToggleRow
          name="guestExperience.askTransportation"
          title={t('askTransportation')}
          description={t('askTransportationDescription')}
        />
        {transportationEnabled && <TransportationDetails />}
      </div>
    </SectionCard>
  );
}
