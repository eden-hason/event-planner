// Actions (server-only)
export {
  logout,
  sendOtp,
  verifyOtp,
  signInWithGoogle,
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
export { SaveEventPill } from './components/save-event-pill';

// Utils
export { isVisitor, SAVE_REQUIRED } from './utils/visitor';

// Schemas/Types
export type { User, ProfileData } from './schemas';

// Note: getCurrentUser and getUserProfile are exported from '@/features/auth/queries'
// to avoid importing server-only code into client components
