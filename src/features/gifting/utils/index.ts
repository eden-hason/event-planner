import type { GiftProviderConfig, GiftProviderStatus } from '../types';
import { validateBitLink, validatePayboxLink } from './validate-links';

export {
  validatePayboxLink,
  validateBitLink,
  isValidPayboxLink,
  isValidBitLink,
  type LinkError,
} from './validate-links';

export { decodeBitQr } from './decode-bit-qr';

type Provider = 'paybox' | 'bit';

/**
 * Badge state for a provider card. `incomplete` = the toggle is on but the
 * link is missing or invalid, which is exactly the state that would send a
 * guest to a dead button, so it is called out rather than shown as connected.
 */
export function giftProviderStatus(
  provider: Provider,
  config: GiftProviderConfig | undefined,
): GiftProviderStatus {
  const link = config?.link?.trim() ?? '';
  if (!link) return config?.enabled ? 'incomplete' : 'off';

  const invalid =
    provider === 'paybox'
      ? validatePayboxLink(link) !== null
      : validateBitLink(link) !== null;

  if (invalid) return 'incomplete';
  return config?.enabled ? 'connected' : 'off';
}
