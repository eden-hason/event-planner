'use client';

import { useFormContext } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { MessageSquareText } from 'lucide-react';
import { Switch } from '@/components/ui/toggle-switch';
import { FormControl, FormField } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import type { MealChoice } from '@/lib/meal-choices';
import type { EventDetailsFormValues } from '../../schemas';
import { SECTION_IDS } from './event-details-context';
import { SectionCard } from './section-card';

const MEAL_OPTIONS: readonly { value: MealChoice; labelKey: string }[] = [
  { value: 'vegetarian', labelKey: 'meal.vegetarian' },
  { value: 'vegan', labelKey: 'meal.vegan' },
  { value: 'gluten_free', labelKey: 'meal.glutenFree' },
  { value: 'strictly_kosher', labelKey: 'meal.strictlyKosher' },
];

/**
 * The three switches that change what a Guest is asked or told.
 *
 * None of them touch what the product can do - seating works whether or not
 * table numbers are sent, and the RSVP conversation runs without the meal
 * question - so each description says what changes in the conversation rather
 * than what the setting is called.
 */
type ToggleName =
  | 'guestExperience.dietaryOptions'
  | 'guestExperience.lockGuestCount'
  | 'guestExperience.sendTableNumbers';

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
 * The three switches that change what a Guest is asked or told.
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

  const rowClasses = 'border-t py-[11px] lg:py-[13px]';

  return (
    <SectionCard
      id={SECTION_IDS.experience}
      icon={<MessageSquareText className="text-success" />}
      title={t('title')}
      description={t('description')}
      className="gap-1.5 lg:gap-1"
      contentClassName="pt-1.5 lg:pt-2"
    >
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

      <div className={rowClasses}>
        <ToggleRow
          name="guestExperience.sendTableNumbers"
          title={t('sendTableNumbers')}
          description={t('sendTableNumbersDescription')}
        />
      </div>
    </SectionCard>
  );
}
