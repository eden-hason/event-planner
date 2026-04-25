'use client';

import { useCallback, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { IconCoins, IconGift, IconPlus } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useFeatureHeader } from '@/components/feature-layout';
import { type ExpenseApp } from '../schemas/expenses';
import { type GiftApp } from '../schemas/gifts';
import { ExpensesTab } from './expenses-tab';
import { GiftsTab } from './gifts-tab';
import { ExpenseSheet } from './expense-sheet';
import { GiftSheet } from './gift-sheet';

interface GuestOption {
  id: string;
  name: string;
}

interface BudgetPageProps {
  expenses: ExpenseApp[];
  gifts: GiftApp[];
  eventId: string;
  guests: GuestOption[];
}

export function BudgetPage({ expenses, gifts, eventId, guests }: BudgetPageProps) {
  const t = useTranslations('budget');
  const locale = useLocale();

  const [expenseSheetOpen, setExpenseSheetOpen] = useState(false);
  const [giftSheetOpen, setGiftSheetOpen] = useState(false);

  const expensesHeaderAction = useMemo(
    () => (
      <Button onClick={() => setExpenseSheetOpen(true)}>
        <IconPlus size={16} />
        {t('addExpense')}
      </Button>
    ),
    [t],
  );

  const giftsHeaderAction = useMemo(
    () => (
      <Button onClick={() => setGiftSheetOpen(true)}>
        <IconPlus size={16} />
        {t('addGift')}
      </Button>
    ),
    [t],
  );

  const { setHeader } = useFeatureHeader({
    title: t('title'),
    description: t('description'),
    action: expensesHeaderAction,
  });

  const handleTabChange = useCallback(
    (value: string) => {
      setHeader({
        title: t('title'),
        description: t('description'),
        action: value === 'expenses' ? expensesHeaderAction : giftsHeaderAction,
      });
    },
    [setHeader, expensesHeaderAction, giftsHeaderAction, t],
  );

  return (
    <>
      <Tabs
        defaultValue="expenses"
        onValueChange={handleTabChange}
        dir={locale === 'he' ? 'rtl' : 'ltr'}
      >
        <TabsList className="border-border mb-4 h-10 w-full justify-start gap-4 rounded-none border-b bg-transparent p-0">
          <TabsTrigger
            value="expenses"
            className="data-[state=active]:text-primary data-[state=active]:after:bg-primary relative h-full flex-none rounded-none border-none bg-transparent px-1 pb-3 shadow-none after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            <IconCoins size={16} />
            {t('tabs.expenses')}
          </TabsTrigger>
          <TabsTrigger
            value="gifts"
            className="data-[state=active]:text-primary data-[state=active]:after:bg-primary relative h-full flex-none rounded-none border-none bg-transparent px-1 pb-3 shadow-none after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            <IconGift size={16} />
            {t('tabs.gifts')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expenses">
          <ExpensesTab
            expenses={expenses}
            eventId={eventId}
            onAddExpense={() => setExpenseSheetOpen(true)}
          />
        </TabsContent>

        <TabsContent value="gifts">
          <GiftsTab
            gifts={gifts}
            eventId={eventId}
            guests={guests}
            onAddGift={() => setGiftSheetOpen(true)}
          />
        </TabsContent>
      </Tabs>

      <ExpenseSheet
        open={expenseSheetOpen}
        onOpenChange={setExpenseSheetOpen}
        expense={null}
        eventId={eventId}
        existingExpenses={expenses}
      />

      <GiftSheet
        open={giftSheetOpen}
        onOpenChange={setGiftSheetOpen}
        gift={null}
        eventId={eventId}
        guests={guests}
      />
    </>
  );
}
