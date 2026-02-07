import { NextResponse } from 'next/server';
import { executeSchedule } from '@/features/schedules/actions/execute-schedule';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: scheduleId } = await context.params;
    const result = await executeSchedule(scheduleId);

    if (!result.success && result.message === 'Unauthorized') {
      return NextResponse.json(result, { status: 401 });
    }
    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (error) {
    console.error('API execution error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 },
    );
  }
}
