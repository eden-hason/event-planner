// Components (client)
export { ConfirmationExperience } from './components/confirmation-experience';

// Actions (server-only)
export { submitConfirmation, recordViewInteraction } from './actions';

// Utils (pure)
export { buildMealOptions, mealLabel, type MealOption } from './utils/meal-options';

// Schemas/Types
export {
  ConfirmationFormSchema,
  type ConfirmationFormData,
  type ConfirmationActionState,
  type ConfirmationPageData,
} from './schemas';

// Note: getConfirmationDataByToken, getConfirmationDataByGuestToken, and
// isGuestInvitationToken are exported from '@/features/confirmation/queries'
// to avoid importing server-only code into client components
