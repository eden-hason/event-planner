'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { BouncingBallIcon } from '@/components/ui/icons/svg-spinners-bouncing-ball';
import { PricingCard } from '@/components/ui/pricing-card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { OnboardingFormData } from '@/lib/schemas/onboarding';

const PricingStepSchema = z.object({
  pricingPlan: z.string().min(1, 'Please select a pricing plan'),
});

type PricingStepData = z.infer<typeof PricingStepSchema>;

interface CompleteStepProps {
  data?: Partial<OnboardingFormData>;
  onSubmit: (data: PricingStepData) => void;
  onPrevious: () => void;
  isLoading?: boolean;
}

const pricingPlans = [
  {
    id: 'basic',
    title: 'Basic',
    price: 'Free',
    description: 'Perfect for small events',
    features: [
      'Up to 100 guests',
      'Basic RSVP tracking',
      'Email support',
      'Event calendar',
      'Guest list management',
    ],
  },
  {
    id: 'pro',
    title: 'Pro',
    price: '$99',
    description: 'Ideal for growing businesses',
    features: [
      'Up to 500 guests',
      'Advanced RSVP tracking',
      'Priority support',
      'Custom branding',
      'Analytics dashboard',
      'Integration with calendar apps',
    ],
  },
];

export function PricingStep({
  data,
  onSubmit,
  onPrevious,
  isLoading,
}: CompleteStepProps) {
  console.log('data', data);
  const [selectedPlan, setSelectedPlan] = React.useState<string>(
    data?.pricingPlan || '',
  );

  const form = useForm<PricingStepData>({
    resolver: zodResolver(PricingStepSchema),
    defaultValues: {
      pricingPlan: data?.pricingPlan || '',
    },
  });

  const handlePlanSelect = (value: string) => {
    const planId = value || '';
    setSelectedPlan(planId);
    form.setValue('pricingPlan', planId);
  };

  const handleSubmit = (values: PricingStepData) => {
    onSubmit(values);
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
          <ToggleGroup
            type="single"
            value={selectedPlan}
            onValueChange={handlePlanSelect}
            spacing={1}
            variant="outline"
            className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch"
          >
            {pricingPlans.map((plan) => (
              <ToggleGroupItem
                key={plan.id}
                value={plan.id}
                aria-label={plan.title}
                className="h-full p-0 w-full rounded-xl border-2 border-transparent ring-0 focus:ring-0 data-[state=on]:bg-transparent data-[state=on]:border-2 data-[state=on]:border-primary data-[state=on]:rounded-xl data-[state=on]:ring-0 flex"
              >
                <PricingCard
                  title={plan.title}
                  price={plan.price}
                  description={plan.description}
                  features={plan.features}
                  selected={false}
                  onSelect={() => handlePlanSelect(plan.id)}
                  className="w-full h-full border-0"
                />
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          {form.formState.errors.pricingPlan && (
            <p className="text-sm text-destructive text-center">
              {form.formState.errors.pricingPlan.message}
            </p>
          )}

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={onPrevious}
              className="flex-1"
              disabled={isLoading}
            >
              Previous
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? (
                <BouncingBallIcon className="mr-2" size={16} />
              ) : (
                'Complete'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
