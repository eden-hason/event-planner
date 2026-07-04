// Components
export { AiAssistant } from './components/ai-assistant';

// Utils (pure)
export { buildSystemPrompt } from './utils/build-system-prompt';

// Types
export type {
  AiChatMessage,
  AiChatTools,
  AiEventSummary,
  AiGuestListItem,
  AiGuestSide,
  AiRsvpStatus,
  AiWriteToolName,
  ProposeAddGuestInput,
  ProposeDeleteGuestInput,
  ProposeUpdateGuestInput,
  WriteToolOutput,
} from './types';

// Note: tools.ts is server-only (built per-request inside the /api/ai-chat
// route handler) and is intentionally NOT re-exported here - import it
// directly from '@/features/ai-chat/tools' in server code only.
