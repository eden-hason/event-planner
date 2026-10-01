import { NextResponse } from 'next/server';
import { deleteGroups } from '@/features/guests/actions/groups';

/**
 * The commit-on-leave path of a deferred group delete (ADR 0025), the twin of
 * `guests/delete`. When the Owner closes or backgrounds the tab while the Undo
 * toast is still running, the page sends the pending delete here with
 * `fetch(..., { keepalive: true })`. If this request never arrives, the group
 * survives, which is the safe way to fail.
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
    return NextResponse.json({ success: false }, { status: 400 });
  }
  if (!Array.isArray(ids) || !ids.every((id) => typeof id === 'string')) {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const result = await deleteGroups(eventId, ids);
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
