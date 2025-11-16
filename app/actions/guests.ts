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

export type SendSMSState = {
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

    revalidatePath('/guests');
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

    revalidatePath('/guests');
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

export async function sendSMS(
  phoneNumber: string,
  message: string,
): Promise<SendSMSState> {
  try {
    // 1. Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        message: 'Unauthorized: You must be logged in to send a message.',
      };
    }

    // 2. Validate environment variables
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.error('Missing Twilio environment variables');
      return {
        success: false,
        message: 'SMS service is not configured.',
      };
    }

    // 3. Validate inputs
    if (
      !message ||
      typeof message !== 'string' ||
      message.trim().length === 0
    ) {
      return {
        success: false,
        message: 'Message is required and must be a non-empty string.',
      };
    }

    if (
      !phoneNumber ||
      typeof phoneNumber !== 'string' ||
      phoneNumber.trim().length === 0
    ) {
      return {
        success: false,
        message: 'Phone number is required and must be a non-empty string.',
      };
    }

    // 4. Initialize Twilio client
    const twilioClient = twilio(twilioAccountSid, twilioAuthToken);

    // 5. Send SMS
    const twilioMessage = await twilioClient.messages.create({
      body: message.trim(),
      from: twilioPhoneNumber,
      to: phoneNumber.trim(),
    });

    return {
      success: true,
      message: 'SMS sent successfully!',
      messageSid: twilioMessage.sid,
    };
  } catch (error) {
    console.error('Send SMS error:', error);

    return {
      success: false,
      message:
        error instanceof Error
          ? `Failed to send SMS: ${error.message}`
          : 'Failed to send SMS. Please try again.',
    };
  }
}
