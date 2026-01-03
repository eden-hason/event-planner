import { ScheduleApp } from './schemas/schedule.schemas';

export const getSchedules = async (): Promise<ScheduleApp[]> => {
  try {
    return [
      {
        id: '1',
        name: 'Schedule 1',
        description: 'Description 1',
        dueTime: '2025-01-01T00:00:00Z',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
    ];
  } catch (error) {
    console.error('Error fetching schedules:', error);
    throw new Error('Failed to fetch schedules');
  }
};
