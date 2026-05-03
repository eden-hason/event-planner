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
      templateName: 'confirmation_casual_v1_he',
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

  event_reminder_v1_he: {
    whatsapp: {
      templateKey: 'event_reminder_v1_he',
      templateName: 'event_reminder_v1_he',
      bodyText:
        'היום זה קורה! 🎊\nהחתונה של {{1}} ו{{2}}\n🕒 שעה: {{3}} \n📍 מיקום:{{4}}\nלנוחיותכם - קישור לניווט לארוע',
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
        buttonPlaceholders: [],
      },
      description: 'Day-of wedding reminder sent to confirmed guests with event time and venue',
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
