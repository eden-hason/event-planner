import type { TemplateConfig } from '../schemas/whatsapp-templates';

export type { TemplateConfig };

export const WHATSAPP_TEMPLATES: Record<string, TemplateConfig> = {
  invitation_casual: {
    whatsapp: {
      templateKey: 'invitation_casual',
      templateName: 'invitation_casual',
      bodyText:
        'אורחים יקרים,\nשמחים להזמין אתכם לחתונתנו  🎉\nמצורפת ההזמנה עם כל הפרטים – נשמח לראותכם!\n{{1}} ו{{2}} 👰🏻‍♀️🤵🏻',
      languageCode: 'he',
      headerType: 'IMAGE',
      headerText: null,
      footerText: null,
      parameters: {
        headerPlaceholders: [
          {
            type: 'image',
            source: 'event.invitations.imageUrl',
          },
        ],
        placeholders: {
          bride_name: {
            source: 'event.hostDetails.bride.name',
            transformer: 'none',
          },
          groom_name: {
            source: 'event.hostDetails.groom.name',
            transformer: 'none',
          },
        },
        buttonPlaceholders: [],
      },
      description:
        'Initial wedding invitation sent to guests with the couple\'s image. Includes bride and groom names.',
    },
    sms: undefined,
  },

  confirmation_casual_v1_he: {
    whatsapp: {
      templateKey: 'confirmation_casual_v1_he',
      templateName: 'confirmation_initial_with_header_casual',
      bodyText:
        'היי אורחים יקרים\nהחתונה של {{1}} ו{{2}} מתקרבת, נשמח לדעת אם תגיעו.\n\n📅 {{3}}\n📍 {{4}}\n\nמחכים לחגוג איתכם ❤️\nלאישור הגעה, לחצו על הכפתור 👇🏼',
      languageCode: 'he',
      headerType: 'IMAGE',
      headerText: null,
      footerText: null,
      parameters: {
        headerPlaceholders: [
          {
            type: 'image',
            source: 'event.invitations.imageUrl',
          },
        ],
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
            text: 'אישור הגעה',
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

  follow_up_confirmation_casual: {
    whatsapp: {
      templateKey: 'follow_up_confirmation_casual',
      templateName: 'follow_up_confirmation_casual',
      bodyText:
        'היי אורחים יקרים \nאם עדיין לא הספקתם לאשר הגעה לחתונה של {{1}} ו{{2}}, נשמח לעדכון קצר דרך הכפתור המצורף.\n\n📅 {{3}} \n📍 {{4}}\n\nתודה, זה ממש עוזר לנו להיערך כמו שצריך 🙏🏼',
      languageCode: 'he',
      headerType: null,
      headerText: null,
      footerText: null,
      parameters: {
        headerPlaceholders: [],
        // Order matters: positional {{n}} = insertion order.
        // {{1}} bride, {{2}} groom, {{3}} date, {{4}} venue.
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
            text: 'אישור הגעה',
            placeholders: [
              { source: 'confirmationToken', transformer: 'none' },
            ],
          },
        ],
      },
      description:
        'Follow-up RSVP reminder for guests who have not yet confirmed (no header image)',
    },
    sms: undefined,
  },
  thank_you_v1_he: {
    whatsapp: {
      templateKey: 'thank_you_v1_he',
      templateName: 'thank_you_v1_he',
      bodyText:
        'רצינו להגיד תודה ענקית שהגעת לחתונתנו 🙏🏼\nשמחנו מאוד שחלקת איתנו את הרגע!\n{{1}} ו{{2}} ❤️',
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
        },
        buttonPlaceholders: [],
      },
      description: 'Post-event thank you message sent to guests who attended the wedding',
    },
    sms: undefined,
  },

  event_reminder_casual: {
    whatsapp: {
      templateKey: 'event_reminder_casual',
      templateName: 'event_reminder_casual',
      bodyText:
        'היי אורחים יקרים\nתזכורת לחתונה של {{1}} ו{{2}} שמתקיימת היום\n\n📍 {{3}}\n🕒 {{4}}\n\nמחכים לראותכם 🎉',
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
          'event.venueName': {
            source: 'event.location.name',
            transformer: 'none',
          },
          'event.receptionTime': {
            source: 'event.receptionTime',
            transformer: 'none',
          },
        },
        buttonPlaceholders: [
          {
            index: 0,
            subType: 'url',
            text: 'ניווט לאירוע',
            placeholders: [
              { source: 'event.location.name', transformer: 'wazeNavQuery' },
            ],
          },
          {
            index: 1,
            subType: 'url',
            text: 'מתנה בביט',
            placeholders: [
              { source: 'event.eventSettings.bitConfig.phoneNumber', transformer: 'none' },
            ],
          },
        ],
      },
      description: 'Day-of wedding reminder with Waze navigation and Bit gift buttons',
    },
    sms: {
      bodyText:
        'היי אורחים יקרים\nתזכורת לחתונה של {{1}} ו{{2}} שמתקיימת היום\n\n📍 {{3}}\n‏🕒 {{4}}\n\nמחכים לראותכם 🎉\nלניווט לאירוע, לחצו על הקישור 👇🏼\n{{5}}',
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
          'event.venueName': {
            source: 'event.location.name',
            transformer: 'none',
          },
          'event.receptionTime': {
            source: 'event.receptionTime',
            transformer: 'none',
          },
          'event.navShortUrl': {
            source: 'event.shortCode',
            transformer: 'navShortUrl',
          },
        },
        buttonPlaceholders: [],
      },
    },
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
