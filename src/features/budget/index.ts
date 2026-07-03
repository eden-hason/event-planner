// Components
export { BudgetPage } from './components';

// Actions (server-only)
export {
  upsertExpense,
  deleteExpense,
  upsertGift,
  deleteGift,
  type UpsertExpenseState,
  type DeleteExpenseState,
} from './actions';

// Schemas
export {
  ExpenseAppSchema,
  ExpenseDbSchema,
  ExpenseDbToAppTransformerSchema,
  ExpenseUpsertSchema,
  ExpenseAppToDbTransformerSchema,
  type ExpenseApp,
  type ExpenseUpsert,
} from './schemas';

// Types
export {
  getExpenseStatus,
  formatCurrency,
  EXPENSE_PRESETS,
  type GiftRow,
  type ExpenseStatus,
} from './types';

// Note: getEventExpenses and getEventGifts are exported from '@/features/budget/queries'
// to avoid importing server-only code into client components
