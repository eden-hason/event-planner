import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_VERCEL_URL ||
  'http://localhost:3000';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('events')
    .select('location')
    .eq('short_code', code)
    .single();

  if (error || !data) {
    return NextResponse.redirect(SITE_URL, { status: 302 });
  }

  const location = data.location as {
    name?: string;
    coords?: { lat: number; lng: number };
  } | null;

  const name = location?.name?.trim();

  if (!name && !location?.coords) {
    return NextResponse.redirect(SITE_URL, { status: 302 });
  }

  // Waze reads `q` and `ll` together as "search this name near these
  // coordinates", and we send both whenever we have both.
  //
  // The name alone is not enough to navigate by: it is only the Places
  // `main_text`, with the locality half dropped (see location-input), and free
  // typing stores whatever was typed with no place at all - so searching it
  // near the guest's own position can resolve to a same-named hall in another
  // town. The coordinates alone are exact but nameless, leaving the guest
  // looking at a reverse-geocoded street address rather than their venue. The
  // pair gives the name on screen and the coordinates as the tie-breaker.
  const wazeParams: string[] = [];
  if (name) wazeParams.push(`q=${encodeURIComponent(name)}`);
  if (location?.coords) {
    wazeParams.push(`ll=${location.coords.lat},${location.coords.lng}`);
  }
  wazeParams.push('navigate=yes');

  // Both URLs carry the same query, so the app and the web fallback can never
  // send a guest to two different places.
  const query = wazeParams.join('&');
  const deepLink = `waze://?${query}`;
  const webFallback = `https://waze.com/ul?${query}`;

  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>פותח ניווט...</title>
    <script>
      window.location.href = ${JSON.stringify(deepLink)};
      setTimeout(function () {
        window.location.href = ${JSON.stringify(webFallback)};
      }, 1500);
    </script>
  </head>
  <body></body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  });
}
