'use client';

import { useFormContext } from 'react-hook-form';
import { Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { EventDetailsUpdate } from '../../schemas';

export function CoupleCard() {
  const form = useFormContext<EventDetailsUpdate>();

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5" />
          The Couple
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h4 className="text-muted-foreground text-sm font-medium">
            Couple Names
          </h4>
          <FormField
            control={form.control}
            name="hostDetails.bride.name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bride Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter bride's name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="hostDetails.groom.name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Groom Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter groom's name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        <div className="space-y-4">
          <h4 className="text-muted-foreground text-sm font-medium">
            Parents&apos; Names
          </h4>
          <FormField
            control={form.control}
            name="hostDetails.bride.parents"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bride&apos;s Side</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter bride's parents names"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="hostDetails.groom.parents"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Groom&apos;s Side</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter groom's parents names"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
