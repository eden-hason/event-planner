// Actions (server-only)
export {
  logout,
  sendOtp,
  verifyOtp,
  signInWithGoogle,
  switchSignInMethod,
  updateUserProfile,
  saveAvatarUrl,
} from './actions';

// Components
export { VisitorDroppedDialog } from './components/visitor-dropped-dialog';
export {
  SaveEventProvider,
  useSaveEvent,
  useSaveGatedClick,
} from './components/save-event-provider';
export { SaveEventPage } from './components/save-event-page';
export { OtherMethodPrompt } from './components/other-method-prompt';

// Utils
export { isVisitor, parseSaveReason, safeReturnPath, SAVE_REQUIRED } from './utils/visitor';
export type { SignInMethod } from './utils/sign-in-method';

// Schemas/Types
export type { User, ProfileData } from './schemas';

// Note: getCurrentUser and getUserProfile are exported from '@/features/auth/queries'
// to avoid importing server-only code into client components
