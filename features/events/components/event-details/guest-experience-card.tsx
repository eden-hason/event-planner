'use client';

import { useFormContext } from 'react-hook-form';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cardHover } from '@/lib/utils';
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
    <Card className={cardHover}>
      <CardHeader>
        <CardTitle className="text-xl font-bold">Guest Experience</CardTitle>
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
