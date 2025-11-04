'use server';

import { redirect } from 'next/navigation';
import { OnboardingSchema, OnboardingFormData } from '@/lib/schemas/onboarding';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/utils/supabase/server';

export type OnboardingStep = 'profile' | 'event' | 'pricing';

export interface OnboardingActionState {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
  data?: Partial<OnboardingFormData>;
  nextStep?: OnboardingStep | null;
}

/**
 * Determines the next step in the onboarding flow
 * @param currentStep - The current onboarding step
 * @returns The next step, or null if current step is the last
 */
function getNextStep(currentStep: OnboardingStep): OnboardingStep | null {
  const stepOrder: OnboardingStep[] = ['profile', 'event', 'pricing'];
  const currentIndex = stepOrder.indexOf(currentStep);

  if (currentIndex === -1 || currentIndex === stepOrder.length - 1) {
    return null; // Invalid step or last step
  }

  return stepOrder[currentIndex + 1];
}

export async function getOnboardingProfileData(): Promise<Partial<OnboardingFormData> | null> {
  try {
    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return null;
    }

    const supabase = await createClient();

    // Fetch profile data from database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile data:', profileError);
      return null;
    }

    if (!profile) {
      return null;
    }

    // Fetch event data from events table
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (eventsError) {
      console.error('Error fetching event data:', eventsError);
      // Don't return null here - we can still return profile data
    }

    // Parse file metadata from JSON if it exists (from event file_metadata)
    let fileMetadata = undefined;
    const fileSource = events?.file_metadata;
    if (fileSource) {
      try {
        // Check if it's JSON string (new format) or already an object (JSONB)
        if (typeof fileSource === 'string' && fileSource.startsWith('{')) {
          fileMetadata = JSON.parse(fileSource);
        } else if (typeof fileSource === 'object') {
          // Already an object (if stored as JSONB)
          fileMetadata = fileSource;
        }
      } catch {
        // If parsing fails, ignore it
        fileMetadata = undefined;
      }
    }

    // Map profile and event data to onboarding form data
    const formData: Partial<OnboardingFormData> = {
      full_name: profile.full_name || '',
      email: profile.email || user.email || '',
      phone_number: profile.phone_number || undefined,
      company: profile.company || undefined,
      jobTitle: profile.jobTitle || undefined,
      // Event data from events table
      eventDate: events?.event_date ? new Date(events.event_date) : undefined,
      eventType: events?.event_type || undefined,
      maxGuests: events?.maxGuests || undefined,
      file: fileMetadata,
      // Preferences still from profile (for complete step)
      eventTypes: profile.eventTypes || undefined,
      budget: profile.budget || undefined,
      pricingPlan: profile.pricing_plan || undefined,
    };

    return formData;
  } catch (error) {
    console.error('Error fetching onboarding profile data:', error);
    return null;
  }
}

export async function updateOnboardingStep(
  prevState: OnboardingActionState | null,
  formData: FormData,
): Promise<OnboardingActionState> {
  let shouldRedirect = false;
  let result: OnboardingActionState | null = null;

  try {
    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Unauthorized' };
    }

    // Extract and validate data
    const data = Object.fromEntries(formData);
    const step = data.step as string;

    // Validate the step data based on current step
    let validatedData: Partial<OnboardingFormData> = {};

    if (step === 'profile') {
      const profileData = {
        full_name: data.full_name as string,
        email: data.email as string,
        phone_number: (data.phone_number as string) || undefined,
      };

      const validationResult = OnboardingSchema.pick({
        full_name: true,
        email: true,
        phone_number: true,
      }).safeParse(profileData);

      if (!validationResult.success) {
        return {
          success: false,
          message: 'Validation failed',
          errors: validationResult.error.flatten().fieldErrors,
          data: profileData,
        };
      }

      validatedData = validationResult.data;
    } else if (step === 'event') {
      // Parse file metadata if it exists (it's sent as JSON string)
      let fileMetadata = undefined;
      if (data.file) {
        try {
          fileMetadata = JSON.parse(data.file as string);
        } catch {
          // If parsing fails, it might be an old format URL string - ignore it
          fileMetadata = undefined;
        }
      }

      const eventData = {
        eventDate: data.eventDate
          ? new Date(data.eventDate as string)
          : undefined,
        eventType: (data.eventType as string) || undefined,
        file: fileMetadata,
      };

      const validationResult = OnboardingSchema.pick({
        eventDate: true,
        eventType: true,
        file: true,
      }).safeParse(eventData);

      if (!validationResult.success) {
        return {
          success: false,
          message: 'Validation failed',
          errors: validationResult.error.flatten().fieldErrors,
          data: eventData,
        };
      }

      validatedData = validationResult.data;
    } else if (step === 'pricing') {
      const pricingData = {
        pricingPlan: (data.pricingPlan as string) || undefined,
      };

      const validationResult = OnboardingSchema.pick({
        pricingPlan: true,
      }).safeParse(pricingData);

      if (!validationResult.success) {
        return {
          success: false,
          message: 'Validation failed',
          errors: validationResult.error.flatten().fieldErrors,
          data: pricingData,
        };
      }

      validatedData = validationResult.data;
    }

    const supabase = await createClient();

    if (step === 'profile') {
      // Update user profile with the validated data
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: validatedData.full_name,
          email: validatedData.email,
          phone_number: validatedData.phone_number,
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        return {
          success: false,
          message: 'Failed to update profile. Please try again.',
        };
      }
    } else if (step === 'event') {
      // Create or update event in events table
      // First, check if user already has an event (for onboarding, likely just one)
      const { data: existingEvents, error: fetchError } = await supabase
        .from('events')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (fetchError) {
        console.error('Error fetching existing events:', fetchError);
        return {
          success: false,
          message: 'Failed to fetch events. Please try again.',
        };
      }

      // Prepare event data
      const eventData = {
        title: validatedData.eventType || 'My Event', // Use eventType as title, or default
        event_date:
          validatedData.eventDate?.toISOString() || new Date().toISOString(),
        event_type: validatedData.eventType || undefined,
        description: validatedData.eventType || undefined,
        user_id: user.id,
        // Store file metadata as JSON string if it exists
        file_metadata: validatedData.file
          ? JSON.stringify(validatedData.file)
          : null,
      };

      if (existingEvents && existingEvents.length > 0) {
        // Update existing event
        const { error: updateError } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', existingEvents[0].id)
          .eq('user_id', user.id);

        if (updateError) {
          console.error('Error updating event:', updateError);
          return {
            success: false,
            message: 'Failed to update event. Please try again.',
          };
        }
      } else {
        // Create new event
        const { error: insertError } = await supabase
          .from('events')
          .insert(eventData);

        if (insertError) {
          console.error('Error creating event:', insertError);
          return {
            success: false,
            message: 'Failed to create event. Please try again.',
          };
        }
      }
    } else if (step === 'pricing') {
      // Update user profile with the pricing plan
      const { error } = await supabase
        .from('profiles')
        .update({
          pricing_plan: validatedData.pricingPlan,
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating pricing plan:', error);
        return {
          success: false,
          message: 'Failed to update pricing plan. Please try again.',
        };
      }
    }

    if (step === 'pricing') {
      const { error } = await supabase
        .from('profiles')
        .update({
          initial_setup_complete: true,
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating initial setup complete:', error);
        return {
          success: false,
          message: 'Failed to update initial setup complete. Please try again.',
        };
      }

      // Set flag to redirect in finally block
      shouldRedirect = true;
      // Store result to return if redirect doesn't happen
      result = {
        success: true,
        message: 'Step updated successfully',
        data: validatedData,
      };
    } else {
      // Determine next step
      const nextStep = getNextStep(step as OnboardingStep);

      result = {
        success: true,
        message: 'Step updated successfully',
        data: validatedData,
        nextStep,
      };
    }
  } catch (error) {
    console.error('Onboarding step update error:', error);
    result = {
      success: false,
      message: 'Failed to update step. Please try again.',
    };
  } finally {
    // Redirect in finally block if pricing step was successfully completed
    if (shouldRedirect) {
      redirect('/dashboard');
    }
  }

  // Return result (won't be reached if redirect happens)
  return result!;
}
