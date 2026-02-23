import type { ParameterResolutionContext } from '../utils/parameter-resolvers';

const BASE_URL = 'https://webapi.mymarketing.co.il';

// TODO: Make SMS body dynamic based on the schedule's message type (e.g. initial_invitation,
// first_confirmation, event_reminder, etc.) so the tone and content match the original
// WhatsApp template intent rather than always using a generic invitation copy.
const DEFAULT_SMS_BODY =
  "Hi! You're invited to {{event_name}}. Please confirm your attendance:";

/**
 * Sends an SMS message via ActiveTrail API.
 *
 * @param params.to - Recipient phone number in E.164 format
 * @param params.body - SMS message body
 */
export async function sendSmsMessage({
  to,
  body,
}: {
  to: string;
  body: string;
}): Promise<{ success: boolean; messageId?: string; message: string }> {
  const apiKey = process.env.ACTIVE_TRAIL_API_KEY!;

  try {
    const response = await fetch(
      `${BASE_URL}/api/smscampaign/OperationalMessage`,
      {
        method: 'POST',
        headers: {
          Authorization: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          details: {
            name: 'Operational SMS',
            from_name: 'Kululu',
            content: body,
          },
          scheduling: {
            send_now: true,
          },
          mobiles: [{ phone_number: to }],
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('ActiveTrail SMS API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        to,
      });
      return {
        success: false,
        message:
          (errorData as { message?: string })?.message ||
          `SMS API error: ${response.statusText}`,
      };
    }

    const data = (await response.json()) as {
      id?: string;
      message_id?: string;
    };
    const messageId = data?.id ?? data?.message_id;

    return {
      success: true,
      message: 'SMS sent successfully',
      messageId: messageId ? String(messageId) : undefined,
    };
  } catch (error) {
    console.error('SMS send error:', error);
    return { success: false, message: 'Failed to send SMS message' };
  }
}

/**
 * Builds an SMS fallback body by interpolating the default template and
 * appending the RSVP confirmation link on a new line.
 *
 * Supported placeholders: {{guest_name}}, {{event_name}}.
 */
export function buildSmsFallbackBody(
  context: ParameterResolutionContext,
  confirmationToken: string,
): string {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    'http://localhost:3000';
  const rsvpLink = `${siteUrl}/confirm/${confirmationToken}`;

  const body = DEFAULT_SMS_BODY.replace(
    '{{event_name}}',
    context.event.title ?? '',
  );

  return `${body}\n${rsvpLink}`;
}
