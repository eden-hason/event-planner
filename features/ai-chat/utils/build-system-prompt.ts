import type { EventSummary } from '../queries/get-event-summary';

export function buildSystemPrompt(event: EventSummary | null): string {
  const base = `You are a helpful assistant inside Kululu, an event-planning app. Answer questions concisely and helpfully. You can help with event logistics, guest management, timelines, catering estimates, vendor tips, RSVP strategies, and general event-planning advice.`;

  if (!event) return base;

  const giftTotal = event.gifts.reduce((sum, g) => sum + (g.amount ?? 0), 0);
  const giftLines = event.gifts.length
    ? event.gifts
        .map((g) => {
          const parts = [`  - ${g.guestName ?? 'Unknown'}: ₪${g.amount ?? 0}`];
          if (g.paymentMethod) parts.push(`(${g.paymentMethod})`);
          if (g.notes) parts.push(`— ${g.notes}`);
          return parts.join(' ');
        })
        .join('\n')
    : '  (none yet)';

  return `${base}

Current event context:
- Name: "${event.name}"
- Date: ${event.date}
- Guests so far: ${event.guestCount}
- Gifts (${event.gifts.length} records, total ₪${giftTotal.toLocaleString()}):
${giftLines}

Reference this context when relevant. Do not invent details beyond what is provided.`;
}
