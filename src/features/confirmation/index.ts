// Components (client)
export { ConfirmationExperience } from './components/confirmation-experience';
export { ConfirmationSuccess } from './components/confirmation-success';

// Actions (server-only)
export { submitConfirmation, recordViewInteraction } from './actions';

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
