import { anthropic } from '@ai-sdk/anthropic';
import { convertToModelMessages, stepCountIs, streamText } from 'ai';
import type { UIMessage } from 'ai';
import { createClient } from '@/lib/supabase/server';
import { buildTools } from '@/features/ai-chat/tools';
import { buildSystemPrompt } from '@/features/ai-chat/utils/build-system-prompt';

export const maxDuration = 60;

const MODEL = 'claude-haiku-4-5-20251001';

export async function POST(req: Request) {
  const { messages, eventId } = (await req.json()) as {
    messages: UIMessage[];
    eventId?: string;
  };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }
  if (!eventId) {
    return new Response('Missing eventId', { status: 400 });
  }

  const result = streamText({
    model: anthropic(MODEL),
    system: buildSystemPrompt(),
    messages: await convertToModelMessages(messages),
    tools: buildTools(supabase, eventId),
    stopWhen: stepCountIs(6),
  });

  return result.toUIMessageStreamResponse();
}
