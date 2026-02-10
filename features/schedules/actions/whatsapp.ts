'use server';

import type { MediaParameter } from '../utils';
import type { ButtonComponent } from '../utils/parameter-resolvers';

export type SendWhatsAppTestState = {
  success: boolean;
  message: string;
  messageId?: string;
};

export type SendWhatsAppTemplateResult = {
  success: boolean;
  message: string;
  messageId?: string;
};

/**
 * Sends a test WhatsApp message to a hardcoded recipient using Meta's Graph API.
 * Uses the 'hello_world' template for testing purposes.
 *
 * @returns Result state with success status and optional message ID
 */
export async function sendWhatsAppTestMessage(): Promise<SendWhatsAppTestState> {
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

/**
 * Sends a WhatsApp template message to a recipient using Meta's Graph API.
 *
 * @param params - Message parameters
 * @param params.to - Recipient phone number in E.164 format (+972548129777)
 * @param params.templateName - Meta template name registered in WhatsApp Business
 * @param params.languageCode - Template language code (e.g., 'en_US', 'he')
 * @param params.parameters - Optional body parameters for template placeholders
 * @param params.headerParameters - Optional header parameters
 * @returns Result with success status and optional WhatsApp message ID
 */
export async function sendWhatsAppTemplateMessage(params: {
  to: string;
  templateName: string;
  languageCode: string;
  parameters?: MediaParameter[];
  headerParameters?: MediaParameter[];
  buttonParameters?: ButtonComponent[];
}): Promise<SendWhatsAppTemplateResult> {
  try {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      return {
        success: false,
        message: 'WhatsApp is not configured.',
      };
    }

    // Build template components
    const components = [];

    // Add header parameters if provided
    if (params.headerParameters && params.headerParameters.length > 0) {
      components.push({
        type: 'header',
        parameters: params.headerParameters,
      });
    }

    // Add body parameters if provided
    if (params.parameters && params.parameters.length > 0) {
      components.push({
        type: 'body',
        parameters: params.parameters,
      });
    }

    // Add button parameters if provided (each button is a separate component)
    if (params.buttonParameters?.length) {
      components.push(...params.buttonParameters);
    }

    // Build request body
    const requestBody = {
      messaging_product: 'whatsapp',
      to: params.to,
      type: 'template',
      template: {
        name: params.templateName,
        language: {
          code: params.languageCode,
        },
        ...(components.length > 0 && { components }),
      },
    };

    const response = await fetch(
      `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('WhatsApp API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        to: params.to,
        template: params.templateName,
      });

      return {
        success: false,
        message:
          errorData?.error?.message ||
          `WhatsApp API error: ${response.statusText}`,
      };
    }

    const data = await response.json();
    const messageId = data?.messages?.[0]?.id;

    return {
      success: true,
      message: 'Message sent successfully',
      messageId,
    };
  } catch (error) {
    console.error('WhatsApp send error:', error);
    return {
      success: false,
      message: 'Failed to send WhatsApp message',
    };
  }
}
