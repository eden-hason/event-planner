import { createClient } from '@/utils/supabase/server';
import { ScheduleApp } from './schemas/schedule.schemas';

// Check if user has completed initial setup
export const getInitialSetupStatus = async (): Promise<boolean> => {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return false;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('initial_setup_complete')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching setup status:', error);
      return false;
    }

    return profile?.initial_setup_complete ?? false;
  } catch (error) {
    console.error('Error checking initial setup status:', error);
    return false;
  }
};

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
