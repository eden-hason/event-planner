import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import {
  buildOccasionPhrase,
  readEventTypeKey,
} from '@/features/events/utils/event-title';
import {
  buildCalendarEntry,
  toGoogleCalendarUrl,
  toIcs,
} from '@/features/schedules';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_VERCEL_URL ||
  'http://localhost:3000';

// The save-the-date's "הוספה ליומן" button. Sits beside /nav/[code] and
// outside [locale] for the same reason: a short fixed base URL Meta can carry
// in a URL button, with the short code as its only variable.
//
// Android gets a Google Calendar link: a downloaded .ics lands in the
// downloads tray there rather than in the calendar. Everything else - iOS
// above all - gets the .ics inline, which Safari opens straight into the
// "Add to Calendar" sheet, and which Outlook and desktop calendars import.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('events')
    .select('title, event_date, reception_time, location, host_details, event_types (key)')
    .eq('short_code', code)
    .single();

  if (error || !data) {
    return NextResponse.redirect(SITE_URL, { status: 302 });
  }

  const location = data.location as { name?: string } | null;

  const entry = buildCalendarEntry({
    shortCode: code,
    // The Occasion Phrase reads as a title on its own ("חתונה של נועה
    // ודורון"); the stored title is only the fallback, since it follows the
    // Owner's locale.
    title:
      buildOccasionPhrase({
        eventTypeKey: readEventTypeKey(data.event_types),
        hostDetails: (data.host_details as Record<string, unknown> | null) ?? undefined,
      }) ?? data.title,
    eventDate: data.event_date,
    receptionTime: data.reception_time,
    venueName: location?.name ?? null,
    navUrl: location ? `${SITE_URL}/nav/${code}` : null,
  });

  if (!entry) {
    return NextResponse.redirect(SITE_URL, { status: 302 });
  }

  const userAgent = request.headers.get('user-agent') ?? '';
  if (/android/i.test(userAgent)) {
    return NextResponse.redirect(toGoogleCalendarUrl(entry), { status: 302 });
  }

  return new NextResponse(toIcs(entry), {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="event.ics"',
      'Cache-Control': 'no-store',
    },
  });
}
