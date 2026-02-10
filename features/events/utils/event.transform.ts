import {
  type EventSettings,
  type EventDetailsUpdate,
  type HostDetails,
  type Location,
  type InvitationsDb,
} from '../schemas';

// DB shape for guests_experience (snake_case)
type GuestsExperienceDb = {
  dietary_options?: boolean;
};

// Type for event details update to DB
type EventDetailsDbUpdate = {
  id: string;
  event_date?: string;
  event_type?: string | null;
  reception_time?: string | null;
  ceremony_time?: string | null;
  venue_name?: string | null;
  location?: Location | null;
  host_details?: HostDetails | null;
  event_settings?: EventSettings | null;
  invitations?: InvitationsDb | null;
  guests_experience?: GuestsExperienceDb | null;
};

// Transforms event details update data from camelCase to snake_case for DB
export function eventDetailsUpdateToDb(
  data: EventDetailsUpdate,
): EventDetailsDbUpdate {
  const dbData: EventDetailsDbUpdate = {
    id: data.id,
  };

  if (data.eventDate !== undefined) {
    dbData.event_date = data.eventDate;
  }
  if (data.eventType !== undefined) {
    dbData.event_type = data.eventType || null;
  }
  if (data.receptionTime !== undefined) {
    dbData.reception_time = data.receptionTime || null;
  }
  if (data.ceremonyTime !== undefined) {
    dbData.ceremony_time = data.ceremonyTime || null;
  }
  if (data.venueName !== undefined) {
    dbData.venue_name = data.venueName || null;
  }
  if (data.location !== undefined) {
    dbData.location = data.location || null;
  }

  // hostDetails maps directly to host_details (structure matches DB)
  if (data.hostDetails !== undefined) {
    dbData.host_details = data.hostDetails;
  }

  // eventSettings maps to event_settings with snake_case conversion
  if (
    data.eventSettings?.payboxConfig !== undefined ||
    data.eventSettings?.bitConfig !== undefined
  ) {
    dbData.event_settings = {};

    if (data.eventSettings?.payboxConfig !== undefined) {
      dbData.event_settings.paybox_config = {
        enabled: data.eventSettings.payboxConfig.enabled ?? false,
        link: data.eventSettings.payboxConfig.link || '',
      };
    }

    if (data.eventSettings?.bitConfig !== undefined) {
      dbData.event_settings.bit_config = {
        enabled: data.eventSettings.bitConfig.enabled ?? false,
        phoneNumber: data.eventSettings.bitConfig.phoneNumber || '',
      };
    }
  }

  // invitations maps to invitations with snake_case conversion
  if (data.invitations !== undefined) {
    dbData.invitations = {
      front_image_url: data.invitations.frontImageUrl,
      back_image_url: data.invitations.backImageUrl,
    };
  }

  // guestExperience maps to guests_experience with snake_case conversion
  if (data.guestExperience !== undefined) {
    dbData.guests_experience = {
      dietary_options: data.guestExperience.dietaryOptions,
    };
  }

  return dbData;
}
