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
