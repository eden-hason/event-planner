'use server';

import { getCurrentUser } from '@/features/auth/queries';
import {
  GuestUpsertSchema,
  AppToDbTransformerSchema,
  ImportGuestSchema,
  type ImportGuestData,
} from '@/features/guests/schemas';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import twilio from 'twilio';
import { z } from 'zod';

export type UpsertGuestState = {
  success: boolean;
  errors?: z.ZodError<z.input<typeof GuestUpsertSchema>>;
  message?: string | null;
};

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
    // Handle explicit null for groupId (remove from group)
    if (parsedData.groupId === 'null') {
      parsedData.groupId = null;
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
    const dbData = AppToDbTransformerSchema.parse(validatedData);
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

// --- Bulk Import Guests ---

export type ImportGuestsState = {
  success: boolean;
  message: string;
  importedCount?: number;
  failedCount?: number;
};

export async function importGuests(
  eventId: string,
  guests: ImportGuestData[],
): Promise<ImportGuestsState> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        message: 'You must be logged in to import guests',
      };
    }

    if (!guests || guests.length === 0) {
      return {
        success: false,
        message: 'No guests to import',
      };
    }

    // Validate all guests
    const validGuests: {
      name: string;
      phone_number: string;
      amount: number;
      event_id: string;
    }[] = [];
    const errors: string[] = [];

    for (let i = 0; i < guests.length; i++) {
      const result = ImportGuestSchema.safeParse(guests[i]);
      if (result.success) {
        validGuests.push({
          name: result.data.name,
          phone_number: result.data.phone,
          amount: result.data.amount,
          event_id: eventId,
        });
      } else {
        errors.push(`Row ${i + 1}: ${result.error.issues[0]?.message}`);
      }
    }

    if (validGuests.length === 0) {
      return {
        success: false,
        message: 'No valid guests to import',
        failedCount: errors.length,
      };
    }

    const supabase = await createClient();

    const { error } = await supabase.from('guests').insert(validGuests);

    if (error) {
      console.error('Supabase insert error:', error);
      return {
        success: false,
        message: `Database error: ${error.message}`,
      };
    }

    revalidatePath(`/app/${eventId}/guests`);

    return {
      success: true,
      message: `Successfully imported ${validGuests.length} guest${validGuests.length === 1 ? '' : 's'}`,
      importedCount: validGuests.length,
      failedCount: errors.length,
    };
  } catch (error) {
    console.error('Import guests error:', error);
    return {
      success: false,
      message:
        error instanceof Error
          ? `Failed to import guests: ${error.message}`
          : 'Failed to import guests. Please try again.',
    };
  }
}
