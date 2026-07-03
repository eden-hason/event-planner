'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CardTitle } from '@/components/ui/card';

export interface PricingCardProps {
  title: string;
  price: string;
  period?: string;
  description?: string;
  features: string[];
  ctaText?: string;
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
}

export function PricingCard({
  title,
  price,
  period,
  description,
  features,
  ctaText,
  selected = false,
  onSelect,
  className,
}: PricingCardProps) {
  return (
    <Card
      className={cn(
        'relative flex flex-col transition-all hover:shadow-md w-full h-full',
        selected && 'ring-2 ring-primary',
        className,
      )}
    >
      <CardHeader className="text-center pb-4">
        <CardTitle className="">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="flex-1 space-y-6">
        <div className="text-center">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-bold">{price}</span>
            {period && (
              <span className="text-muted-foreground text-lg">{period}</span>
            )}
          </div>
        </div>

        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <span className="text-sm text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      {ctaText && (
        <CardFooter className="pt-0">
          <Button
            variant={selected ? 'default' : 'outline'}
            className="w-full"
            onClick={onSelect}
          >
            {ctaText}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
