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

export { duplicateEvent, type DuplicateEventState } from './duplicate-event';
