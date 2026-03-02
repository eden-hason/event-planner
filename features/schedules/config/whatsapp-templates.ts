import type { TemplateConfig } from '../schemas/whatsapp-templates';

export type { TemplateConfig };

export const WHATSAPP_TEMPLATES: Record<string, TemplateConfig> = {
  initial_invitation: {
    whatsapp: {
      templateKey: 'initial_invitation',
      templateName: 'initial_invitation',
      displayName: 'Initial Invitation',
      bodyText:
        "Hey! 🎉\n{{1}} & {{2}} are getting married and you're invited!\n📅 {{3}}\n📍 {{4}}\nLooking forward to seeing you there! ❤️",
      languageCode: 'en',
      headerType: 'IMAGE',
      headerText: null,
      footerText: null,
      parameters: {
        headerPlaceholders: [
          {
            type: 'image',
            source: 'event.invitations.imageUrl',
            fallback: null,
          },
        ],
        placeholders: {
          bride_name: {
            source: 'event.hostDetails.bride.name',
            fallback: 'the bride',
            transformer: 'none',
          },
          groom_name: {
            source: 'event.hostDetails.groom.name',
            fallback: 'the groom',
            transformer: 'none',
          },
          event_date: {
            source: 'event.eventDate',
            fallback: 'soon',
            transformer: 'formatDate',
            transformerOptions: { format: 'long', locale: 'en-US' },
          },
          event_location: {
            source: 'event.location.name',
            fallback: 'the venue',
            transformer: 'none',
          },
        },
        buttonPlaceholders: [],
      },
      description:
        "First message sent to guests announcing the wedding. Includes the couple's uploaded invitation image, bride and groom names, event date, and venue location. Sets a warm, celebratory tone for the event.",
    },
    sms: undefined,
  },

  confirmation_casual_v1_he: {
    whatsapp: {
      templateKey: 'confirmation_casual_v1_he',
      templateName: 'confirmation_casual_v1_he',
      displayName: 'Confirmation',
      bodyText:
        'היי, \nהוזמנת לחתונתם של {{1}} ו{{2}}\nשתתקיים בתאריך {{3}} ב{{4}}\nמחכים לדעת אם נזכה לראות אותך באירוע.\nלאישור הגעה ופרטים נוספים, לחצו על הכפתור למטה',
      languageCode: 'he',
      headerType: null,
      headerText: null,
      footerText: null,
      parameters: {
        headerPlaceholders: [],
        placeholders: {
          'host.bride.name': {
            source: 'event.hostDetails.bride.name',
            transformer: 'none',
          },
          'host.groom.name': {
            source: 'event.hostDetails.groom.name',
            transformer: 'none',
          },
          'event.eventDate': {
            source: 'event.eventDate',
            transformer: 'formatDate',
            transformerOptions: { format: 'long', locale: 'he-IL' },
          },
          'event.venueName': {
            source: 'event.location.name',
            transformer: 'none',
          },
        },
        buttonPlaceholders: [
          {
            index: 0,
            subType: 'url',
            placeholders: [
              { source: 'confirmationToken', transformer: 'none' },
            ],
          },
        ],
      },
      description: 'Wedding invitation with RSVP button',
    },
    sms: undefined,
  },
};

export function getTemplateByKey(key: string): TemplateConfig | null {
  return WHATSAPP_TEMPLATES[key] ?? null;
}

export function getTemplatesByKeys(
  keys: string[],
): Map<string, TemplateConfig> {
  const map = new Map<string, TemplateConfig>();
  for (const key of keys) {
    const template = WHATSAPP_TEMPLATES[key];
    if (template) {
      map.set(key, template);
    }
  }
  return map;
}
