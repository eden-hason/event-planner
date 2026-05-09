'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';
import { cn } from '@/lib/utils';
import { PLAN_CAPACITY, type PricingPlanId } from '@/features/events/constants';

const PLANS: Array<{ id: PricingPlanId; reserved: number; price: number; popular: boolean }> = [
  { id: 'tier_100', reserved: 10, price: 190, popular: false },
  { id: 'tier_200', reserved: 20, price: 360, popular: true },
  { id: 'tier_300', reserved: 30, price: 510, popular: false },
  { id: 'tier_400', reserved: 40, price: 640, popular: false },
];

interface PricingStepProps {
  onConfirm: (planId: string) => void;
  onBack: () => void;
  isPending: boolean;
}

export function PricingStep({ onConfirm, onBack, isPending }: PricingStepProps) {
  const t = useTranslations('newEvent.step4');
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="mb-1 text-xl font-bold">{t('title')}</h2>
        <p className="text-muted-foreground text-sm">{t('description')}</p>
      </div>

      <div className="flex flex-col gap-4">
        {PLANS.map((plan, i) => (
          <button
            key={plan.id}
            type="button"
            onClick={() => setSelected(plan.id)}
            disabled={isPending}
            style={{ animationDelay: `${i * 60}ms` }}
            className={cn(
              'relative cursor-pointer rounded-lg border p-4 text-left transition-all duration-150',
              '[animation:slide-up_0.35s_ease_backwards]',
              selected === plan.id
                ? 'border-primary bg-primary/5'
                : 'border-border bg-card hover:border-primary/40',
            )}
          >
            {plan.popular && (
              <span className="bg-primary text-primary-foreground absolute -top-2.5 left-3 rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide">
                {t('popular')}
              </span>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold tabular-nums">{PLAN_CAPACITY[plan.id]}</span>
                <span className="text-muted-foreground text-sm">{t('recordsLabel')}</span>
              </div>
              <div className="text-right">
                <span className="text-primary text-xl font-bold tabular-nums">
                  {t('currency')}{plan.price}
                </span>
              </div>
            </div>

            <Item
              variant="outline"
              size="sm"
              className="mt-3 border-dashed border-primary/30 bg-primary/5 py-2 px-3 text-start"
            >
              <ItemContent>
                <ItemTitle className="text-primary font-bold">
                  +{plan.reserved} {t('reservedLabel')}
                </ItemTitle>
                <ItemDescription className="text-[11px]">
                  {t('reservedBonus')}
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
                  <Gift className="text-primary size-4" />
                </div>
              </ItemActions>
            </Item>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Button
          onClick={() => onConfirm(selected!)}
          disabled={!selected || isPending}
          className="w-full"
        >
          {t('continue')}
        </Button>
        <Button
          variant="ghost"
          onClick={onBack}
          disabled={isPending}
          className="text-muted-foreground w-full"
        >
          {t('goBack')}
        </Button>
      </div>
    </div>
  );
}
