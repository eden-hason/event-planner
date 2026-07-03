import { anthropic } from '@ai-sdk/anthropic';
import { streamText, convertToModelMessages } from 'ai';
import { createClient } from '@/lib/supabase/server';
import { getEventSummary } from '@/features/ai-chat/queries/get-event-summary';
import { buildSystemPrompt } from '@/features/ai-chat/utils/build-system-prompt';

export const maxDuration = 60;

export async function POST(req: Request) {
  if (process.env.ENABLE_AI_CHAT !== 'true') {
    return new Response('Not Found', { status: 404 });
  }

  const { messages, eventId } = await req.json();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const eventContext = eventId ? await getEventSummary(supabase, eventId) : null;
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: anthropic('claude-haiku-4-5-20251001'),
    system: buildSystemPrompt(eventContext),
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}
