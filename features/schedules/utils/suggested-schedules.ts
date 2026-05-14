import { DEFAULT_SCHEDULES_BY_EVENT_TYPE } from '../constants';
import { type ActionType } from '../schemas';
import { calculateScheduledDate } from './index';

export type SuggestedSchedule = {
  templateKey: string;
  actionType: ActionType;
  daysOffset: number;
  defaultTime: string;
  targetStatus: 'pending' | 'confirmed' | null;
  scheduledDate: string; // concrete ISO date derived from the event date
};

/**
 * Builds the list of suggested schedules to seed the setup wizard with,
 * resolving each default config into a concrete date based on the event date.
 * Returns an empty array when the event type has no defaults or the date is missing.
 */
export function buildSuggestedSchedules(
  eventType: string,
  eventDate: string,
): SuggestedSchedule[] {
  const configs = DEFAULT_SCHEDULES_BY_EVENT_TYPE[eventType];
  if (!configs || !eventDate) return [];

  return configs.map((config) => ({
    templateKey: config.templateKey,
    actionType: config.actionType,
    daysOffset: config.daysOffset,
    defaultTime: config.defaultTime,
    targetStatus: config.targetStatus ?? null,
    scheduledDate: calculateScheduledDate(
      eventDate,
      config.daysOffset,
      config.defaultTime,
    ),
  }));
}
