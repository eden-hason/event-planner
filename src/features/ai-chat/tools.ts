// Server-only: constructed inside the /api/ai-chat route handler with a
// per-request Supabase client. `eventId` is captured in the tool closures so
// the model can never target another event. Do NOT re-export this module
// through the feature barrel.
import { tool } from 'ai';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AiEventSummary, AiGuestListItem } from './types';

const rsvpStatusSchema = z.enum(['pending', 'confirmed', 'declined']);
const sideSchema = z.enum(['bride', 'groom']);

export function buildTools(supabase: SupabaseClient, eventId: string) {
  return {
    // --- Read tools (auto-run server-side) ---

    listGuests: tool({
      description:
        'List the guests of this event, including their ids. Optionally filter by RSVP status. Always call this before proposing an update or delete so you have real guest ids and names.',
      inputSchema: z.object({
        rsvpStatus: rsvpStatusSchema
          .optional()
          .describe('Only return guests with this RSVP status'),
      }),
      execute: async ({ rsvpStatus }): Promise<AiGuestListItem[]> => {
        let query = supabase
          .from('guests')
          .select('id, name, rsvp_status, side, amount, group_id')
          .eq('event_id', eventId)
          .order('name', { ascending: true });

        if (rsvpStatus) {
          query = query.eq('rsvp_status', rsvpStatus);
        }

        const { data, error } = await query;
        if (error) {
          throw new Error(`Could not load guests: ${error.message}`);
        }
        return (data ?? []) as AiGuestListItem[];
      },
    }),

    getEventSummary: tool({
      description:
        'Get aggregate numbers for this event: guest counts by RSVP status, total headcount (sum of guest amounts), total expected expenses, and total gifts received.',
      inputSchema: z.object({}),
      execute: async (): Promise<AiEventSummary> => {
        const [guestsRes, expensesRes, giftsRes] = await Promise.all([
          supabase
            .from('guests')
            .select('rsvp_status, amount')
            .eq('event_id', eventId),
          supabase.from('expenses').select('estimate').eq('event_id', eventId),
          supabase.from('gifts').select('amount').eq('event_id', eventId),
        ]);

        if (guestsRes.error) {
          throw new Error(`Could not load guests: ${guestsRes.error.message}`);
        }
        if (expensesRes.error) {
          throw new Error(
            `Could not load expenses: ${expensesRes.error.message}`,
          );
        }
        if (giftsRes.error) {
          throw new Error(`Could not load gifts: ${giftsRes.error.message}`);
        }

        const guests = (guestsRes.data ?? []) as Array<{
          rsvp_status: string | null;
          amount: number | null;
        }>;
        const expenses = (expensesRes.data ?? []) as Array<{
          estimate: number | string | null;
        }>;
        const gifts = (giftsRes.data ?? []) as Array<{
          amount: number | string | null;
        }>;

        const countBy = (status: string) =>
          guests.filter((g) => g.rsvp_status === status).length;

        return {
          totalGuests: guests.length,
          confirmed: countBy('confirmed'),
          declined: countBy('declined'),
          pending: countBy('pending'),
          totalHeadcount: guests.reduce((sum, g) => sum + (g.amount ?? 0), 0),
          expensesEstimateTotal: expenses.reduce(
            (sum, e) => sum + (Number(e.estimate) || 0),
            0,
          ),
          giftsTotal: gifts.reduce((sum, g) => sum + (Number(g.amount) || 0), 0),
        };
      },
    }),

    // --- Write tools (NO execute: proposals confirmed by the user in the browser) ---

    proposeAddGuest: tool({
      description:
        'Propose adding a new guest to this event. The user must approve the proposal in the UI before anything is saved. Never claim the guest was added until the tool result confirms it.',
      inputSchema: z.object({
        name: z.string().min(2).max(255).describe('Full name of the guest'),
        phone: z
          .string()
          .optional()
          .describe('Israeli mobile phone number, e.g. 054-1234567'),
        side: sideSchema.optional().describe('Which side the guest belongs to'),
        amount: z
          .number()
          .int()
          .min(1)
          .default(1)
          .describe('Number of people included in this invitation'),
        rsvpStatus: rsvpStatusSchema.default('pending'),
        notes: z.string().optional(),
      }),
    }),

    proposeUpdateGuest: tool({
      description:
        'Propose updating an existing guest. Use a real guest id from listGuests. Only include the fields that should change. The user must approve the proposal before anything is saved.',
      inputSchema: z.object({
        id: z.uuid().describe('The id of the guest to update, from listGuests'),
        name: z.string().min(2).max(255).optional(),
        phone: z.string().optional(),
        side: sideSchema.optional(),
        amount: z.number().int().min(1).optional(),
        rsvpStatus: rsvpStatusSchema.optional(),
        notes: z.string().optional(),
      }),
    }),

    proposeDeleteGuest: tool({
      description:
        'Propose deleting a guest from this event. Use a real guest id and name from listGuests. The user must approve the proposal before anything is deleted.',
      inputSchema: z.object({
        id: z.uuid().describe('The id of the guest to delete, from listGuests'),
        name: z
          .string()
          .describe('The name of the guest, shown in the confirmation card'),
      }),
    }),
  };
}
