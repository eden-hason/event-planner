import type { UIDataTypes, UIMessage } from 'ai';

export type AiRsvpStatus = 'pending' | 'confirmed' | 'declined';
export type AiGuestSide = 'bride' | 'groom';

/** Row shape returned by the listGuests read tool */
export type AiGuestListItem = {
  id: string;
  name: string;
  rsvp_status: AiRsvpStatus | null;
  side: AiGuestSide | null;
  amount: number | null;
  group_id: string | null;
};

/** Aggregate shape returned by the getEventSummary read tool */
export type AiEventSummary = {
  totalGuests: number;
  confirmed: number;
  declined: number;
  pending: number;
  totalHeadcount: number;
  expensesEstimateTotal: number;
  giftsTotal: number;
};

export type ProposeAddGuestInput = {
  name: string;
  phone?: string;
  side?: AiGuestSide;
  amount?: number;
  rsvpStatus?: AiRsvpStatus;
  notes?: string;
};

export type ProposeUpdateGuestInput = {
  id: string;
  name?: string;
  phone?: string;
  side?: AiGuestSide;
  amount?: number;
  rsvpStatus?: AiRsvpStatus;
  notes?: string;
};

export type ProposeDeleteGuestInput = {
  id: string;
  name: string;
};

/** Result the client reports back after resolving a proposed write */
export type WriteToolOutput = {
  ok: boolean;
  declined?: boolean;
  error?: string;
};

export type AiWriteToolName =
  | 'proposeAddGuest'
  | 'proposeUpdateGuest'
  | 'proposeDeleteGuest';

/** Tool map used to type UIMessage parts (`tool-listGuests`, `tool-proposeAddGuest`, ...) */
export type AiChatTools = {
  listGuests: {
    input: { rsvpStatus?: AiRsvpStatus };
    output: AiGuestListItem[];
  };
  getEventSummary: {
    input: Record<string, never>;
    output: AiEventSummary;
  };
  proposeAddGuest: {
    input: ProposeAddGuestInput;
    output: WriteToolOutput;
  };
  proposeUpdateGuest: {
    input: ProposeUpdateGuestInput;
    output: WriteToolOutput;
  };
  proposeDeleteGuest: {
    input: ProposeDeleteGuestInput;
    output: WriteToolOutput;
  };
};

export type AiChatMessage = UIMessage<unknown, UIDataTypes, AiChatTools>;
