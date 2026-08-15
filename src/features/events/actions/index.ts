// Event server actions
// This file provides a clean API for importing event-related server actions

export {
  createEvent,
  updateEventDetails,
  deleteEvent,
  setDefaultEvent,
  type DeleteEventState,
  type SetDefaultEventState,
} from './events';

export {
  createDraftEvent,
  setDraftNames,
  setDraftDate,
  setDraftLocation,
  setDraftEstimate,
  publishDraftEvent,
  discardDraftEvent,
} from './draft-event';

export type { CreateDraftEventState, DraftStepState } from '../schemas';

export { duplicateEvent, type DuplicateEventState } from './duplicate-event';

export { updateEventLandingTemplate, type UpdateLandingTemplateState } from './landing-template';
