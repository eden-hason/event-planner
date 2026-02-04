'use server';

export type SendWhatsAppTestState = {
  success: boolean;
  message: string;
  messageId?: string;
};

/**
 * Sends a test WhatsApp message to a hardcoded recipient using Meta's Graph API.
 *
 * @param messageBody - The message text to send
 * @returns Result state with success status and optional message ID
 */
export async function sendWhatsAppTestMessage(
  messageBody: string,
): Promise<SendWhatsAppTestState> {
  try {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      return { success: false, message: 'WhatsApp is not configured.' };
    }

    const response = await fetch(
      `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: '972548129777',
          type: 'template',
          template: {
            name: 'hello_world',
            language: {
              code: 'en_US',
            },
          },
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('WhatsApp API error:', errorData);
      return {
        success: false,
        message:
          errorData?.error?.message || `API error: ${response.statusText}`,
      };
    }

    const data = await response.json();
    const messageId = data?.messages?.[0]?.id;

    return {
      success: true,
      message: 'Test message sent!',
      messageId,
    };
  } catch (error) {
    console.error('WhatsApp send error:', error);
    return { success: false, message: 'Failed to send message.' };
  }
}
