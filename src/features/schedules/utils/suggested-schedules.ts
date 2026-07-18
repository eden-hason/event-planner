import { type DefaultScheduleApp } from '../schemas/catalog';
import { calculateScheduledDate } from './index';

export type SuggestedSchedule = {
  scheduleTypeId: string;
  scheduleTypeKey: string;
  templateId: string;
  daysOffset: number;
  defaultTime: string;
  targetStatus: 'pending' | 'confirmed' | null;
  scheduledDate: string; // concrete ISO date derived from the event date
};

/**
 * Builds the list of suggested schedules to seed the setup wizard with,
 * resolving each event-type default (fetched from the catalog) into a
 * concrete date based on the event date.
 * Returns an empty array when there are no defaults or the date is missing.
 */
export function buildSuggestedSchedules(
  defaults: DefaultScheduleApp[],
  eventDate: string,
): SuggestedSchedule[] {
  if (!eventDate) return [];

  return defaults.map((config) => ({
    scheduleTypeId: config.scheduleTypeId,
    scheduleTypeKey: config.scheduleTypeKey,
    templateId: config.templateId,
    daysOffset: config.daysOffset,
    defaultTime: config.defaultTime,
    targetStatus: config.targetStatus,
    scheduledDate: calculateScheduledDate(
      eventDate,
      config.daysOffset,
      config.defaultTime,
    ),
  }));
}
