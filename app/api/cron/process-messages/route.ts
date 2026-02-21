import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { processScheduledMessages } from '@/lib/services/message-processor';

export const maxDuration = 10;

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const result = await processScheduledMessages(supabase);

  return NextResponse.json({ success: true, ...result });
}
