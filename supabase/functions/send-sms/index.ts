import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';

const ACTIVE_TRAIL_URL =
  'https://webapi.mymarketing.co.il/api/smscampaign/OperationalMessage';

/**
 * Payload delivered by the Supabase `send_sms` auth hook.
 *
 * On a phone change the code goes to the number being verified, not the
 * current one. A Visitor saving with their phone (ADR 0028) is exactly that:
 * an anonymous user with no `phone` at all, and the new number in `new_phone`.
 * The hosted Auth does not always send `sms_type`, so an empty `phone` with a
 * `new_phone` is read as a phone change too.
 */
interface SendSmsHookPayload {
  user: { phone?: string; new_phone?: string; phone_change?: string };
  sms: { otp: string; sms_type?: string };
}

/** Auth hooks expect failures as `{ error: { http_code, message } }`. */
function hookError(httpCode: number, message: string) {
  return new Response(
    JSON.stringify({ error: { http_code: httpCode, message } }),
    { status: httpCode, headers: { 'Content-Type': 'application/json' } },
  );
}

Deno.serve(async (req) => {
  const apiKey = Deno.env.get('ACTIVE_TRAIL_API_KEY');
  const hookSecret = Deno.env.get('SEND_SMS_HOOK_SECRETS');

  if (!apiKey) {
    console.error('Missing ACTIVE_TRAIL_API_KEY');
    return hookError(500, 'SMS provider is not configured');
  }
  if (!hookSecret) {
    console.error('Missing SEND_SMS_HOOK_SECRETS');
    return hookError(500, 'SMS hook is not configured');
  }

  // This endpoint runs with verify_jwt disabled so Supabase Auth can reach it,
  // so the Standard Webhooks signature is the only thing proving the caller is
  // really Auth and not someone burning our SMS credits.
  const body = await req.text();

  let payload: SendSmsHookPayload;
  try {
    const wh = new Webhook(hookSecret.replace('v1,whsec_', ''));
    payload = wh.verify(
      body,
      Object.fromEntries(req.headers),
    ) as SendSmsHookPayload;
  } catch (error) {
    console.error('Invalid send_sms hook signature:', error);
    return hookError(401, 'Invalid webhook signature');
  }

  const smsType = payload.sms?.sms_type;
  const pendingPhone = payload.user?.new_phone || payload.user?.phone_change;
  const phone =
    smsType === 'phone_change'
      ? pendingPhone
      : payload.user?.phone || pendingPhone;
  const otp = payload.sms?.otp;

  if (!phone || !otp) {
    // Auth reports any 400 from a hook as "Invalid payload sent to hook", so
    // say here which part was missing. Field names only, never their values.
    console.error('send_sms hook payload missing phone or otp:', {
      smsType,
      userFields: Object.keys(payload.user ?? {}),
      smsFields: Object.keys(payload.sms ?? {}),
      hasOtp: !!otp,
    });
    return hookError(400, 'Missing phone or otp in hook payload');
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
    return hookError(500, 'Failed to send SMS');
  }

  return new Response(JSON.stringify({}), {
    headers: { 'Content-Type': 'application/json' },
  });
});
