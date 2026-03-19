import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const ACTIVE_TRAIL_URL =
  'https://webapi.mymarketing.co.il/api/smscampaign/OperationalMessage';

interface HookPayload {
  user: { phone: string };
  sms: { otp: string };
}

serve(async (req) => {
  const body = await req.text();
  const payload: HookPayload = JSON.parse(body);
  const { phone } = payload.user;
  const { otp } = payload.sms;

  const apiKey = Deno.env.get('ACTIVE_TRAIL_API_KEY');
  if (!apiKey) {
    return new Response(
      JSON.stringify({ success: false, error: 'Missing ACTIVE_TRAIL_API_KEY' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const response = await fetch(ACTIVE_TRAIL_URL, {
    method: 'POST',
    headers: {
      Authorization: apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      details: {
        name: 'OTP Verification',
        from_name: 'Kululu',
        content: `Your Kululu verification code is: ${otp}`,
      },
      scheduling: {
        send_now: true,
      },
      mobiles: [{ phone_number: phone }],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('ActiveTrail SMS API error:', {
      status: response.status,
      error: errorData,
      phone,
    });
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to send SMS' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
