import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';

/**
 * Delivers every auth OTP over WhatsApp (ADR 0043), despite the hook's name.
 *
 * Supabase calls the phone-code hook `send_sms` whatever carries the code, and
 * renaming the function would mean repointing the hosted hook too, so the name
 * stays and only the transport changed.
 */
const GRAPH_API_VERSION = 'v22.0';

/**
 * A Meta Authentication-category template. Meta fixes its body ("*{{1}}* is
 * your verification code"), so the only content Kululu owns is the choice of
 * security line, expiry footer and the copy-code button - all set in WhatsApp
 * Manager, none here.
 */
const TEMPLATE_NAME = 'login_code_1';
const LANGUAGE_CODE = 'he';

/**
 * The `biz_opaque_callback_data` Meta echoes on this message's statuses. The
 * webhook knows it as untracked by design - see whatsapp-callback-tag.ts, which
 * this Deno function cannot import.
 */
const CALLBACK_TAG = 'otp';

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

/** Enough of a number to find it in a log, not enough to dial it. */
function maskPhone(phone: string) {
  return phone.length > 4 ? `${'*'.repeat(phone.length - 4)}${phone.slice(-4)}` : '****';
}

Deno.serve(async (req) => {
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
  const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
  const hookSecret = Deno.env.get('SEND_SMS_HOOK_SECRETS');

  if (!phoneNumberId || !accessToken) {
    console.error('Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN');
    return hookError(500, 'WhatsApp is not configured');
  }
  if (!hookSecret) {
    console.error('Missing SEND_SMS_HOOK_SECRETS');
    return hookError(500, 'SMS hook is not configured');
  }

  // This endpoint runs with verify_jwt disabled so Supabase Auth can reach it,
  // so the Standard Webhooks signature is the only thing proving the caller is
  // really Auth and not someone sending paid messages on our account.
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

  // The code goes in twice: once for the body's {{1}}, once for the copy-code
  // button, which Meta models as a URL button whose parameter is the code.
  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        // Auth stores E.164 without the plus; Meta takes either.
        to: phone,
        biz_opaque_callback_data: CALLBACK_TAG,
        type: 'template',
        template: {
          name: TEMPLATE_NAME,
          language: { code: LANGUAGE_CODE },
          components: [
            { type: 'body', parameters: [{ type: 'text', text: otp }] },
            {
              type: 'button',
              sub_type: 'url',
              index: '0',
              parameters: [{ type: 'text', text: otp }],
            },
          ],
        },
      }),
    },
  ).catch((error) => {
    console.error('No answer from Meta for an OTP send:', error);
    return null;
  });

  if (!response) {
    return hookError(502, 'Failed to send WhatsApp code');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('WhatsApp OTP rejected:', {
      status: response.status,
      error: errorData?.error ?? null,
      phone: maskPhone(phone),
    });
    return hookError(500, 'Failed to send WhatsApp code');
  }

  // Accepted is all Meta can say here. A number with no WhatsApp account is
  // usually accepted and fails later, on the webhook - there is no SMS to fall
  // back to (ADR 0043), so the person sees no code and can use Google instead.
  return new Response(JSON.stringify({}), {
    headers: { 'Content-Type': 'application/json' },
  });
});
