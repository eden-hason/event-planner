'use client';

import { useFormContext } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { ChevronDown, MessageCircleQuestion } from 'lucide-react';
import { Switch } from '@/components/ui/toggle-switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from '@/components/ui/item';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
export function GuestExperienceSection() {
  const t = useTranslations('eventDetails.guestExperience');
  const form = useFormContext<EventDetailsFormValues>();

  const mealsEnabled = form.watch('guestExperience.dietaryOptions');

  return (
    <SectionCard
      id={SECTION_IDS.experience}
      icon={<MessageCircleQuestion className="text-primary size-4 shrink-0" />}
      title={t('title')}
      description={t('description')}
      contentClassName="px-0"
    >
      <ItemGroup>
        <FormField
          control={form.control}
          name="guestExperience.dietaryOptions"
          render={({ field }) => (
            <Item>
              <ItemContent>
                <ItemTitle>{t('specialMeal')}</ItemTitle>
                <ItemDescription>{t('specialMealDescription')}</ItemDescription>
              </ItemContent>
              <ItemActions>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </ItemActions>
            </Item>
          )}
        />

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
                <Item className="animate-in slide-in-from-top-1 fade-in-0 duration-200">
                  <ItemContent>
                    <ItemTitle>{t('mealsLabel')}</ItemTitle>
                    {selected.length === 0 && (
                      <ItemDescription className="text-warning">
                        {t('mealsEmpty')}
                      </ItemDescription>
                    )}
                  </ItemContent>
                  <ItemActions className="w-full sm:w-auto">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            'border-input flex h-9 w-full items-center justify-between gap-1.5 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-sm',
                            'hover:bg-accent hover:text-accent-foreground transition-colors',
                            'focus:ring-ring focus:ring-1 focus:outline-none',
                            'sm:w-auto sm:justify-start',
                            selected.length === 0 && 'text-muted-foreground',
                          )}
                        >
                          <span>
                            {selected.length === 0
                              ? t('mealsLabel')
                              : selected
                                .map((value) => {
                                  const option = MEAL_OPTIONS.find(
                                    (meal) => meal.value === value,
                                  );
                                  return option ? t(option.labelKey) : value;
                                })
                                .join(' · ')}
                          </span>
                          <ChevronDown className="size-4 shrink-0 opacity-50" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-52 p-1">
                        <div className="space-y-0.5">
                          {MEAL_OPTIONS.map((meal) => (
                            <label
                              key={meal.value}
                              className="hover:bg-accent flex cursor-pointer items-center gap-2.5 rounded-sm px-2 py-1.5"
                            >
                              <Checkbox
                                checked={selected.includes(meal.value)}
                                onCheckedChange={() => toggleMeal(meal.value)}
                              />
                              <span className="flex-1 text-sm select-none">
                                {t(meal.labelKey)}
                              </span>
                            </label>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </ItemActions>
                </Item>
              );
            }}
          />
        )}

        <FormField
          control={form.control}
          name="guestExperience.lockGuestCount"
          render={({ field }) => (
            <Item>
              <ItemContent>
                <ItemTitle>{t('lockGuestCount')}</ItemTitle>
                <ItemDescription>{t('lockGuestCountDescription')}</ItemDescription>
              </ItemContent>
              <ItemActions>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </ItemActions>
            </Item>
          )}
        />

        <FormField
          control={form.control}
          name="guestExperience.sendTableNumbers"
          render={({ field }) => (
            <Item>
              <ItemContent>
                <ItemTitle>{t('sendTableNumbers')}</ItemTitle>
                <ItemDescription>{t('sendTableNumbersDescription')}</ItemDescription>
              </ItemContent>
              <ItemActions>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </ItemActions>
            </Item>
          )}
        />
      </ItemGroup>
    </SectionCard>
  );
}
