import { NextResponse } from 'next/server';
import { getPathname } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { isVisitor } from '@/features/auth/utils/visitor';
import {
  coPlannerAcceptPath,
  coPlannerLinkPath,
  JOINED_COOKIE,
} from '@/features/collaborate/utils';

/**
 * Joins the signed-in user to the Co-planner Link's Event as an Owner and
 * sends them to it (ADR 0041). Both ways in end here: the link page's Join
 * button, and the return from sign-in, which is pointed straight at this so
 * nobody taps Join twice. Nothing is matched against who they are - the link
 * is the invitation - and joining an Event they are already on is a no-op.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ locale: string; token: string }> },
) {
  const { locale, token } = await params;
  const to = (href: Parameters<typeof getPathname>[0]['href']) =>
    NextResponse.redirect(new URL(getPathname({ href, locale }), request.url));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // A Visitor has a session but no account to plan with (ADR 0028).
  if (!user || isVisitor(user)) {
    return to({ pathname: '/login', query: { next: coPlannerAcceptPath(token) } });
  }

  const { data, error } = await supabase.rpc('join_event_by_co_planner_link', {
    p_token: token,
  });

  if (error || !data?.success) {
    if (error) console.error('Error joining event by co-planner link:', error);
    // An unknown token renders as invalid there; anything else offers Join again.
    return to(
      data?.reason === 'not_found'
        ? coPlannerLinkPath(token)
        : { pathname: coPlannerLinkPath(token), query: { failed: '1' } },
    );
  }

  const response = to(`/app/${data.event_id}/home`);
  if (data.joined) {
    // Read by the browser, which shows the one-time dialog and clears it.
    response.cookies.set(JOINED_COOKIE, '1', {
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 10,
    });
  }
  return response;
}
