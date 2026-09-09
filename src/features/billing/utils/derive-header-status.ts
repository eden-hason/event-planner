import type { BillingHeaderStatus, BillingPillTone, EventBillingStatus } from '../types';

const TONE_BY_STATUS: Record<EventBillingStatus, BillingPillTone> = {
  free: 'plain',
  payment_pending: 'pending',
  paid: 'premium',
  comped: 'premium',
  canceled: 'plain',
};

const SENDING_ENABLED: Record<EventBillingStatus, boolean> = {
  free: false,
  payment_pending: false,
  paid: true,
  comped: true,
  canceled: false,
};

/**
 * Maps the raw billing status to what the header pill needs. Pure - the label
 * and the sheet copy are pulled from the `billing` i18n namespace by status.
 */
export function deriveHeaderStatus(status: EventBillingStatus): BillingHeaderStatus {
  return {
    status,
    tone: TONE_BY_STATUS[status],
    sendingEnabled: SENDING_ENABLED[status],
  };
}
