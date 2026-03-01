'use client';

import { useFormContext } from 'react-hook-form';
import { UtensilsCrossed } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { EventDetailsUpdate } from '../../schemas';

export function GuestExperienceCard() {
  const form = useFormContext<EventDetailsUpdate>();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="rounded-md bg-primary/10 p-1.5">
            <UtensilsCrossed className="h-4 w-4 text-primary" />
          </div>
          Guest Experience
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-row items-center justify-between space-y-0">
          <FormField
            control={form.control}
            name="guestExperience.dietaryOptions"
            render={({ field }) => (
              <FormItem className="flex w-full flex-row items-center justify-between">
                <div className="space-y-0.5">
                  <FormLabel>Dietary Options</FormLabel>
                  <p className="text-muted-foreground text-sm">
                    Ask guests for meal requests
                  </p>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
