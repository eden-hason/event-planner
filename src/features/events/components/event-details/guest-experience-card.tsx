'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useActionState, startTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { z } from 'zod';
import { ChevronDown, Sparkles } from 'lucide-react';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { Switch } from '@/components/ui/switch';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
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
import { Form, FormControl, FormField } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import {
  EventApp,
  EventDetailsUpdateSchema,
  UpdateEventDetailsState,
} from '../../schemas';
import { updateEventDetails } from '../../actions';

const GuestExperienceCardSchema = EventDetailsUpdateSchema.pick({ id: true, guestExperience: true });
type GuestExperienceCardValues = z.infer<typeof GuestExperienceCardSchema>;

const MEAL_OPTIONS = [
  { value: 'vegetarian', labelKey: 'meal.vegetarian' },
  { value: 'vegan', labelKey: 'meal.vegan' },
  { value: 'gluten_free', labelKey: 'meal.glutenFree' },
  { value: 'strictly_kosher', labelKey: 'meal.strictlyKosher' },
] as const;

const ALL_VALUES = MEAL_OPTIONS.map((m) => m.value);

interface GuestExperienceCardProps {
  event: EventApp;
}

export function GuestExperienceCard({ event }: GuestExperienceCardProps) {
  const t = useTranslations('eventDetails.guestExperience');
  const tHeader = useTranslations('eventDetails.header');

  const form = useForm<GuestExperienceCardValues>({
    resolver: zodResolver(GuestExperienceCardSchema),
    defaultValues: {
      id: event.id,
      guestExperience: {
        dietaryOptions: event.guestExperience?.dietaryOptions ?? false,
        dietaryTypes: event.guestExperience?.dietaryTypes ?? ['vegetarian', 'vegan', 'gluten_free', 'strictly_kosher'],
        lockGuestCount: event.guestExperience?.lockGuestCount ?? false,
      },
    },
  });

  const isDirty = form.formState.isDirty;

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

  const onSubmit = (values: GuestExperienceCardValues) => {
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
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 shrink-0 text-primary" />
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
      </form>
    </Form>
  );
}
