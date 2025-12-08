'use server';

import { getCurrentUser } from '@/lib/auth';
import { GuestUpsertSchema } from '@/lib/schemas/guest.schema';
import { guestUpsertToDb } from '@/lib/utils/guest.transform';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { UpsertGuestState } from '@/lib/schemas/guest.schema';
import twilio from 'twilio';

export type DeleteGuestState = {
  success: boolean;
  message: string;
};

export type SendWhatsAppMessageState = {
  success: boolean;
  message: string;
  messageSid?: string;
};

export async function upsertGuest(
  eventId: string,
  formData: FormData,
): Promise<UpsertGuestState> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        message: 'You must be logged in to upsert guests',
      };
    }

    const rawData = Object.fromEntries(formData);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsedData: Record<string, any> = { ...rawData };
    if (parsedData.amount && typeof parsedData.amount === 'string') {
      parsedData.amount = Number(parsedData.amount);
    }

    const validationResult = GuestUpsertSchema.safeParse(parsedData);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return {
        success: false,
        message: firstError.message,
      };
    }

    const validatedData = validationResult.data;
    const dbData = guestUpsertToDb(validatedData);
    const supabase = await createClient();

    const { error } = await supabase.from('guests').upsert(
      {
        ...dbData,
        event_id: eventId,
      },
      {
        onConflict: 'id',
      },
    );

    if (error) {
      console.error(error);
      return {
        success: false,
        message: 'Database error: Could not upsert guest.',
      };
    }

    revalidatePath('/app/guests');
    return {
      success: true,
      message: validatedData.id
        ? 'Guest updated successfully.'
        : 'Guest created successfully.',
    };
  } catch (error) {
    console.error('Upsert guest error:', error);
    return {
      success: false,
      message: 'Failed to upsert guest. Please try again.',
    };
  }
}

export async function deleteGuest(guestId: string): Promise<DeleteGuestState> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        message: 'You must be logged in to delete guests',
      };
    }

    const supabase = await createClient();

    const { error } = await supabase.from('guests').delete().eq('id', guestId);

    if (error) {
      console.error(error);
      return {
        success: false,
        message: 'Database error: Could not delete guest.',
      };
    }

    revalidatePath('/app/guests');
    return {
      success: true,
      message: 'Guest deleted successfully.',
    };
  } catch (error) {
    console.error('Delete guest error:', error);
    return {
      success: false,
      message: 'Failed to delete guest. Please try again.',
    };
  }
}

export async function sendWhatsAppMessage(
  phoneNumber: string,
  message: string,
): Promise<SendWhatsAppMessageState> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        message: 'Unauthorized: You must be logged in to send a message.',
      };
    }

    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = process.env.TWILIO_SENDER_ID;

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.error('Missing Twilio environment variables');
      return {
        success: false,
        message: 'WhatsApp service is not configured.',
      };
    }

    const twilioClient = twilio(twilioAccountSid, twilioAuthToken);

    const twilioMessage = await twilioClient.messages.create({
      body: message.trim(),
      from: 'whatsapp:+14155238886',
      to: `whatsapp:${phoneNumber.trim()}`,
      contentSid: 'HX0c6709657f56ebc45252f1836fc588cc',
      contentVariables: JSON.stringify({
        name: 'John Doe',
      }),
    });

    return {
      success: true,
      message: 'WhatsApp message sent successfully!',
      messageSid: twilioMessage.sid,
    };
  } catch (error) {
    console.error('Send WhatsApp message error:', error);
    return {
      success: false,
      message:
        error instanceof Error
          ? `Failed to send WhatsApp message: ${error.message}`
          : 'Failed to send WhatsApp message. Please try again.',
    };
  }
}