import { canReceiveSms } from '@/lib/phone';
import type { SmsCampaignReport } from '../utils/sms-delivery-report';

const BASE_URL = 'https://webapi.mymarketing.co.il';

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

  // The audience filters already leave numbers from abroad out of every SMS
  // path; this is the backstop for a payload rendered before they did.
  if (!canReceiveSms(to)) {
    return { success: false, message: 'SMS goes to Israeli numbers only' };
  }

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
 * Reads ActiveTrail's report for one sent SMS - its own one-recipient campaign,
 * addressed by the id `sendSmsMessage` returned.
 *
 * Null when the report could not be read (network, auth, a 404 for an id the
 * provider no longer keeps): the caller leaves the attempt as it is and asks
 * again next time. `rateLimited` lets a batch stop instead of hammering on.
 */
export async function getSmsCampaignReport(
  messageId: string,
): Promise<{ report: SmsCampaignReport | null; rateLimited: boolean }> {
  const apiKey = process.env.ACTIVE_TRAIL_API_KEY;
  if (!apiKey) return { report: null, rateLimited: false };

  try {
    const response = await fetch(
      `${BASE_URL}/api/smscampaignreport/${encodeURIComponent(messageId)}`,
      { headers: { Authorization: apiKey }, cache: 'no-store' },
    );
    if (response.status === 429) return { report: null, rateLimited: true };
    if (!response.ok) {
      console.error('ActiveTrail SMS report error:', {
        status: response.status,
        messageId,
      });
      return { report: null, rateLimited: false };
    }
    return {
      report: (await response.json()) as SmsCampaignReport,
      rateLimited: false,
    };
  } catch (error) {
    console.error('ActiveTrail SMS report request failed:', messageId, error);
    return { report: null, rateLimited: false };
  }
}
