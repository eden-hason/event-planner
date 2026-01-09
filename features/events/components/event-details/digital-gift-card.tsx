'use client';

import { useFormContext } from 'react-hook-form';
import { Gift } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { EventDetailsUpdate } from '../../schemas';

export function DigitalGiftCard() {
  const form = useFormContext<EventDetailsUpdate>();
  const payboxEnabled = form.watch('eventSettings.payboxConfig.enabled');
  const bitEnabled = form.watch('eventSettings.bitConfig.enabled');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Gift className="h-5 w-5" />
          Digital Gift
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <FormField
              control={form.control}
              name="eventSettings.payboxConfig.enabled"
              render={({ field }) => (
                <FormItem className="flex w-full flex-row items-center justify-between">
                  <FormLabel>PayBox Group Invite Link</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="eventSettings.payboxConfig.link"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    type="url"
                    placeholder="Paste your PayBox group invite link"
                    disabled={!payboxEnabled}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <p className="text-muted-foreground text-sm">
            How to: Open the PayBox app, create a new Group for your event,
            click Invite Friends, copy the link, and paste it here.
          </p>
        </div>

        <Separator className="my-4" />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <FormField
              control={form.control}
              name="eventSettings.bitConfig.enabled"
              render={({ field }) => (
                <FormItem className="flex w-full flex-row items-center justify-between">
                  <FormLabel>Bit Phone Number</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="eventSettings.bitConfig.phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    type="tel"
                    placeholder="Enter phone number"
                    disabled={!bitEnabled}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <p className="text-muted-foreground text-sm">
            Enter the mobile phone number connected to your Bit account
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
