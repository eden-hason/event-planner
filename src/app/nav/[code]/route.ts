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

  if (!location?.name && !location?.coords) {
    return NextResponse.redirect(SITE_URL, { status: 302 });
  }

  const deepLink = location.coords
    ? `waze://?ll=${location.coords.lat},${location.coords.lng}&navigate=yes`
    : `waze://?q=${encodeURIComponent(location.name!)}&navigate=yes`;

  const webFallback = location.coords
    ? `https://waze.com/ul?ll=${location.coords.lat},${location.coords.lng}&navigate=yes`
    : `https://waze.com/ul?q=${encodeURIComponent(location.name!)}&navigate=yes`;

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
