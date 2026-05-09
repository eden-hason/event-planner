'use client';

import { useFormContext } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from '@/components/ui/item';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { FormControl, FormField } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { EventDetailsUpdate } from '../../schemas';

const MEAL_OPTIONS = [
  { value: 'vegetarian', labelKey: 'meal.vegetarian' },
  { value: 'vegan', labelKey: 'meal.vegan' },
  { value: 'gluten_free', labelKey: 'meal.glutenFree' },
  { value: 'strictly_kosher', labelKey: 'meal.strictlyKosher' },
] as const;

const ALL_VALUES = MEAL_OPTIONS.map((m) => m.value);

export function GuestExperienceCard() {
  const t = useTranslations('eventDetails.guestExperience');
  const form = useFormContext<EventDetailsUpdate>();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-bold">{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ItemGroup>
          <FormField
            control={form.control}
            name="guestExperience.dietaryOptions"
            render={({ field }) => (
              <>
                <Item>
                  <ItemContent>
                    <ItemTitle>{t('specialMealSelection')}</ItemTitle>
                    <ItemDescription>{t('specialMealSelectionDescription')}</ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <FormControl>
                      <Switch
                        checked={field.value ?? false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </ItemActions>
                </Item>

                {field.value && (
                  <FormField
                    control={form.control}
                    name="guestExperience.dietaryTypes"
                    render={({ field: typesField }) => {
                      const selected = typesField.value ?? ALL_VALUES;

                      const toggleMeal = (value: string) => {
                        const next = selected.includes(value)
                          ? selected.filter((v) => v !== value)
                          : [...selected, value];
                        typesField.onChange(next);
                      };

                      const triggerLabel = () => {
                        if (selected.length === 0) return t('mealPlaceholder');
                        if (selected.length === ALL_VALUES.length) return t('allMeals');
                        return t('mealsSelected', { count: selected.length });
                      };

                      return (
                        <Item className="animate-in slide-in-from-top-1 fade-in-0 duration-200">
                          <ItemContent>
                            <ItemTitle>{t('specialMealsLabel')}</ItemTitle>
                            <ItemDescription>
                              {t('specialMealsDescription')}
                            </ItemDescription>
                          </ItemContent>
                          <ItemActions>
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className={cn(
                                    'flex h-9 items-center gap-1.5 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm whitespace-nowrap',
                                    'ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring',
                                    'hover:bg-accent hover:text-accent-foreground transition-colors',
                                    selected.length === 0 && 'text-muted-foreground',
                                  )}
                                >
                                  <span>{triggerLabel()}</span>
                                  <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent align="end" className="w-52 p-1">
                                <div className="space-y-0.5">
                                  {MEAL_OPTIONS.map((meal) => (
                                    <div
                                      key={meal.value}
                                      className="flex items-center gap-2.5 rounded-sm px-2 py-1.5 hover:bg-accent cursor-pointer"
                                      onClick={() => toggleMeal(meal.value)}
                                    >
                                      <Checkbox
                                        checked={selected.includes(meal.value)}
                                        onCheckedChange={() => toggleMeal(meal.value)}
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                      <span className="text-sm select-none flex-1">
                                        {t(meal.labelKey)}
                                      </span>
                                    </div>
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
              </>
            )}
          />

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
                    <Switch
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </ItemActions>
              </Item>
            )}
          />
        </ItemGroup>
      </CardContent>
    </Card>
  );
}
