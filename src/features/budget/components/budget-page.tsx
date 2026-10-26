'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFeatureHeader } from '@/components/feature-layout';
import { type ExpenseApp } from '../schemas/expenses';
import type { GiftRow } from '../types';
import { ExpensesTab } from './expenses-tab';
import { ExpenseSheet } from './expense-sheet';
import { GiftsTab } from './gifts-tab';
import { IconReceipt, IconGift, IconPlus } from '@tabler/icons-react';

interface BudgetPageProps {
  expenses: ExpenseApp[];
  eventId: string;
  eventName?: string;
  eventBudget: number | null;
  gifts: GiftRow[];
}

export function BudgetPage({ expenses, eventId, eventName, eventBudget, gifts }: BudgetPageProps) {
  const t = useTranslations('budget');
  const locale = useLocale();
  const [expenseSheetOpen, setExpenseSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('expenses');
  const [addGiftOpen, setAddGiftOpen] = useState(false);

  /*
   * Each tab hangs its add button in the page header, at every width.
   * `useFeatureHeader` only re-runs on a title change, so the action is pushed
   * through `setHeader` as the tab changes.
   */
  const title = t('title');
  const isGifts = activeTab === 'gifts';
  const headerConfig = {
    title,
    action: (
      <Button
        onClick={() => (isGifts ? setAddGiftOpen(true) : setExpenseSheetOpen(true))}
        className="h-9 gap-[5px] rounded-[10px] px-[13px] font-bold"
      >
        <IconPlus size={16} stroke={2.4} />
        {isGifts ? t('newGift') : t('newExpense')}
      </Button>
    ),
  };
  const { setHeader } = useFeatureHeader(headerConfig);
  useEffect(() => {
    setHeader(headerConfig);
    // Keyed on what the header shows, not on `headerConfig`, which is a new
    // object every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, activeTab, setHeader]);

  return (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      dir={locale === 'he' ? 'rtl' : 'ltr'}
    >
      <TabsList className="border-border mb-6 h-10 w-full rounded-none border-b bg-transparent p-0">
        <TabsTrigger
          value="expenses"
          className="data-[state=active]:text-primary data-[state=active]:after:bg-primary relative h-full flex-1 rounded-none border-none bg-transparent px-1 pb-3 text-sm shadow-none after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
        >
          <IconReceipt size={18} />
          {t('tabs.expenses')}
        </TabsTrigger>
        <TabsTrigger
          value="gifts"
          className="data-[state=active]:text-primary data-[state=active]:after:bg-primary relative h-full flex-1 rounded-none border-none bg-transparent px-1 pb-3 text-sm shadow-none after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
        >
          <IconGift size={18} />
          {t('tabs.gifts')}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="expenses">
        <ExpensesTab
          expenses={expenses}
          eventId={eventId}
          eventName={eventName}
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
        <GiftsTab
          eventId={eventId}
          eventName={eventName}
          initialGifts={gifts}
          addGiftOpen={addGiftOpen}
          onAddGiftOpenChange={setAddGiftOpen}
        />
      </TabsContent>
    </Tabs>
  );
}
