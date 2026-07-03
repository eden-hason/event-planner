// Components (client)
export { AiChatButton } from './components/ai-chat-button';
export { AiChat } from './components/ai-chat';

// Utils (pure)
export { buildSystemPrompt } from './utils/build-system-prompt';

// Types
export type { EventSummary, GiftRecord } from './queries/get-event-summary';

// Note: getEventSummary is exported from '@/features/ai-chat/queries/get-event-summary'
// to avoid importing server-only query code into client components
