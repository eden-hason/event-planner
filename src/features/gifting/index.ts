// Components
export { GiftingPage } from './components';

// Actions (server-only)
export { updateGiftingSettings, type GiftingActionState } from './actions';

// Schemas
export {
  GiftingSettingsUpdateSchema,
  GiftProviderConfigSchema,
  type GiftingSettingsUpdate,
  type GiftProviderConfigInput,
} from './schemas';

// Pure utils / types
export {
  validatePayboxLink,
  validateBitLink,
  isValidPayboxLink,
  isValidBitLink,
  giftProviderStatus,
  decodeBitQr,
  type LinkError,
} from './utils';
export type {
  GiftProviderConfig,
  GiftProviderStatus,
  BitDecodePhase,
  BitDecodeErrorKind,
  BitDecodeResult,
} from './types';
