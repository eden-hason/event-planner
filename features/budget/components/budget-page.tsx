'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFeatureHeader } from '@/components/feature-layout';
import { type ExpenseApp } from '../schemas/expenses';
import type { GiftRow } from '../types';
import { ExpensesTab } from './expenses-tab';
import { ExpenseSheet } from './expense-sheet';
import { GiftsTab } from './gifts-tab';
import { IconReceipt, IconGift } from '@tabler/icons-react';

interface BudgetPageProps {
  expenses: ExpenseApp[];
  eventId: string;
  eventBudget: number | null;
  gifts: GiftRow[];
}

export function BudgetPage({ expenses, eventId, eventBudget, gifts }: BudgetPageProps) {
  const t = useTranslations('budget');
  const locale = useLocale();
  const [expenseSheetOpen, setExpenseSheetOpen] = useState(false);

  useFeatureHeader({
    title: t('title'),
    description: t('description'),
  });

  return (
    <Tabs
      defaultValue="expenses"
      dir={locale === 'he' ? 'rtl' : 'ltr'}
    >
      <TabsList className="border-border mb-6 h-10 w-full justify-start gap-4 rounded-none border-b bg-transparent p-0">
        <TabsTrigger
          value="expenses"
          className="data-[state=active]:text-primary data-[state=active]:after:bg-primary relative h-full flex-none rounded-none border-none bg-transparent px-1 pb-3 text-sm shadow-none after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
        >
          <IconReceipt size={18} />
          {t('tabs.expenses')}
        </TabsTrigger>
        <TabsTrigger
          value="gifts"
          className="data-[state=active]:text-primary data-[state=active]:after:bg-primary relative h-full flex-none rounded-none border-none bg-transparent px-1 pb-3 text-sm shadow-none after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
        >
          <IconGift size={18} />
          {t('tabs.gifts')}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="expenses">
        <ExpensesTab
          expenses={expenses}
          eventId={eventId}
          eventBudget={eventBudget}
          onAddExpense={() => setExpenseSheetOpen(true)}
        />

        <ExpenseSheet
          open={expenseSheetOpen}
          onOpenChange={setExpenseSheetOpen}
          expense={null}
          eventId={eventId}
          existingExpenses={expenses}
        />
      </TabsContent>

      <TabsContent value="gifts">
        <GiftsTab eventId={eventId} initialGifts={gifts} />
      </TabsContent>
    </Tabs>
  );
}
