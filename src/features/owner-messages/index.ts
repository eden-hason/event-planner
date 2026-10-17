// Public API for Owner Messages (ADR 0039): Kululu messaging the Owner who
// created the Event. The send and sweep services are server-only and are
// imported from '@/features/owner-messages/services' directly.

export type {
  OwnerMessageKind,
  OwnerMessageRow,
  OwnerMessageStatus,
  OwnerMessageFacts,
  SendOwnerMessageResult,
} from './types';
export { OWNER_MESSAGE_KINDS } from './types';

export { OWNER_MESSAGE_KIND_LABELS, OWNER_MESSAGE_STATUS_LABELS } from './utils/labels';
export { OWNER_MESSAGE_TEMPLATES, buildOwnerMessagePayload } from './utils/payload';
export { postEventDueAt, isDue, isTooLate, OWNER_MESSAGE_MAX_LATENESS_HOURS } from './utils/due';
export { ownerMessageStatusUpdate } from './utils/status';
