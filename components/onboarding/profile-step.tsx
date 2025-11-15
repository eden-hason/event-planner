'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { BouncingBallIcon } from '@/components/ui/icons/svg-spinners-bouncing-ball';
import { OnboardingFormData } from '@/lib/schemas/onboarding';

const ProfileStepSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  phone_number: z.string().optional(),
});

type ProfileStepData = z.infer<typeof ProfileStepSchema>;

interface ProfileStepProps {
  data?: Partial<OnboardingFormData>;
  onSubmit: (data: ProfileStepData) => void;
  isLoading?: boolean;
}

export function ProfileStep({ data, onSubmit, isLoading }: ProfileStepProps) {
  const form = useForm<ProfileStepData>({
    resolver: zodResolver(ProfileStepSchema),
    defaultValues: {
      full_name: data?.full_name || '',
      email: data?.email || '',
      phone_number: data?.phone_number || '',
    },
  });

  // Update form when data prop changes
  React.useEffect(() => {
    if (data) {
      form.reset({
        full_name: data.full_name || '',
        email: data.email || '',
        phone_number: data.phone_number || '',
      });
    }
  }, [data, form]);

  const handleSubmit = (values: ProfileStepData) => {
    onSubmit(values);
  };

  return (
    <div className="w-full mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="full_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="john@example.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <BouncingBallIcon size={16} /> : 'Continue'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
