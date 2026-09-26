import { NextResponse } from 'next/server';
import { deleteGuests } from '@/features/guests/actions/bulk';

/**
 * The commit-on-leave path of a deferred delete (ADR 0025). When the Owner
 * closes or backgrounds the tab while the Undo toast is still running, the page
 * sends the pending delete here with `fetch(..., { keepalive: true })` - a
 * Server Action cannot be sent that way. If this request never arrives, the
 * rows survive, which is the safe way to fail.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await context.params;
  let ids: unknown;
  try {
    ({ ids } = await request.json());
  } catch {
    return NextResponse.json({ success: false, count: 0 }, { status: 400 });
  }
  if (!Array.isArray(ids) || !ids.every((id) => typeof id === 'string')) {
    return NextResponse.json({ success: false, count: 0 }, { status: 400 });
  }

  const result = await deleteGuests(eventId, ids);
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
