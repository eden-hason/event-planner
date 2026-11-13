/**
 * Every Meta template the Message Plan's definitions imply, as the Graph API
 * create payload (`POST /v22.0/{waba-id}/message_templates`).
 *
 * Built from the same stage definitions the renderer sends with, so what Meta
 * holds and what the code sends cannot drift (ADR 0055). The test pins the
 * result against the 42 templates as submitted (meta-templates.fixture.ts).
 *
 * A media header's sample is an upload handle from the Resumable Upload API,
 * good for one submission, so it is passed in; the default is a placeholder a
 * submission script replaces.
 */

import { KULULU_VALUE_META_SAMPLE } from './fields';
import {
  META_URL_BUTTON_BASE,
  META_URL_BUTTON_SAMPLE_SUFFIX,
  bodyVariables,
  metaBodyText,
  type MessageButton,
  MESSAGE_PLAN_LANGUAGE,
} from './message-parts';
import {
  allShapes,
  shapeHeader,
  templateNameFor,
  type MessageShape,
  type Stage,
} from './shape';
import {
  bodyFor,
  buttonsFor,
  submittedCategoryFor,
  type TemplateCategory,
} from './stages';

export type MetaTemplateButton =
  | { type: 'QUICK_REPLY'; text: string }
  | { type: 'URL'; text: string; url: string; example: string[] };

export type MetaTemplateComponent =
  | {
      type: 'HEADER';
      format: 'IMAGE' | 'VIDEO';
      example: { header_handle: string[] };
    }
  | { type: 'BODY'; text: string; example: { body_text: string[][] } }
  | { type: 'BUTTONS'; buttons: MetaTemplateButton[] };

export type MetaTemplatePayload = {
  name: string;
  language: string;
  category: TemplateCategory;
  components: MetaTemplateComponent[];
};

export type HeaderHandles = { image: string; video: string };

/** What the submission script substituted with real upload handles. */
export const HEADER_HANDLE_PLACEHOLDERS: HeaderHandles = {
  image: '@@IMAGE@@',
  video: '@@VIDEO@@',
};

/**
 * The sample paragraphs each stage's Personal Message templates were submitted
 * with: realistic Owner text, under 400 characters together. A one-paragraph
 * template's sample joins the first two, as the approved probe did.
 */
export const PERSONAL_SAMPLE_PARAGRAPHS: Record<
  Stage,
  readonly [string, string, string]
> = {
  invitation: [
    'דנה יקרה, אחרי שנתיים של תכנון, המון התרגשות וקצת לחץ, אנחנו מתחתנים! נשמח מאוד שתהיו איתנו ביום חמישי, 12 בנובמבר, באולמי הגן בראשון לציון.',
    'קבלת הפנים מתחילה ב-19:30 והחופה ב-20:30. יש חניה חינם ליד האולם, ומי שצריך הסעה מוזמן לכתוב לנו.',
    'בלי מתנות בבקשה, הנוכחות שלכם היא המתנה הכי גדולה. לא יכולים לחכות לראות את כולכם, רוקדים עד הבוקר!',
  ],
  follow_up: [
    'דנה יקרה, עוד לא שמענו ממך ואנחנו ממש רוצים לדעת אם תהיי איתנו ביום חמישי, 12 בנובמבר, באולמי הגן.',
    'אנחנו סוגרים את הרשימה לאולם בסוף השבוע, אז נשמח לתשובה עוד היום. מספיק ללחוץ על אחד הכפתורים למטה.',
    'ואם יש שאלות על הסעה או חניה, אפשר לכתוב לנו ישירות. מחכים לכם!',
  ],
  event_reminder: [
    'דנה יקרה, היום זה קורה! מחכים לראות אותך בחתונה שלנו באולמי הגן, קבלת הפנים מתחילה ב-19:30.',
    'השולחן שלכם: 12. יש חניה חינם ליד האולם, וההסעה יוצאת מתחנת רכבת השלום ב-18:30.',
    'תביאו נעליים נוחות, רוקדים עד הבוקר!',
  ],
  thank_you: [
    'דנה יקרה, תודה שהגעת לחתונה שלנו ושמחת איתנו. היה ערב שלא נשכח.',
    'כל חיבוק, כל ריקוד וכל ברכה ריגשו אותנו מאוד, ואנחנו עדיין עוברים על התמונות.',
    'מקווים לחגוג איתכם עוד הרבה שמחות!',
  ],
};

function bodySample(shape: MessageShape): string[] {
  if (shape.wording === 'personal') {
    const [first, second, third] = PERSONAL_SAMPLE_PARAGRAPHS[shape.stage];
    if (shape.paragraphs === 1) return [`${first} ${second}`];
    return shape.paragraphs === 2 ? [first, second] : [first, second, third];
  }
  return bodyVariables(bodyFor(shape)).map((variable) => {
    if (variable.kind !== 'value')
      throw new Error('A Kululu Wording has no paragraph variables');
    return KULULU_VALUE_META_SAMPLE[variable.key];
  });
}

function metaButton(button: MessageButton): MetaTemplateButton {
  if (button.kind === 'quick_reply')
    return { type: 'QUICK_REPLY', text: button.text };
  const base = META_URL_BUTTON_BASE[button.target];
  return {
    type: 'URL',
    text: button.text,
    url: `${base}{{1}}`,
    example: [`${base}${META_URL_BUTTON_SAMPLE_SUFFIX}`],
  };
}

/** One shape's template, as submitted: header, body with samples, buttons. */
export function metaTemplatePayload(
  shape: MessageShape,
  headerHandles: HeaderHandles = HEADER_HANDLE_PLACEHOLDERS,
): MetaTemplatePayload {
  const components: MetaTemplateComponent[] = [];
  const header = shapeHeader(shape);
  if (header) {
    components.push({
      type: 'HEADER',
      format: header === 'image' ? 'IMAGE' : 'VIDEO',
      example: { header_handle: [headerHandles[header]] },
    });
  }
  components.push({
    type: 'BODY',
    text: metaBodyText(bodyFor(shape)),
    example: { body_text: [bodySample(shape)] },
  });
  const buttons = buttonsFor(shape);
  if (buttons.length)
    components.push({ type: 'BUTTONS', buttons: buttons.map(metaButton) });
  return {
    name: templateNameFor(shape),
    language: MESSAGE_PLAN_LANGUAGE,
    category: submittedCategoryFor(shape),
    components,
  };
}

/** The whole set, one template per shape. */
export function messagePlanMetaTemplates(
  headerHandles: HeaderHandles = HEADER_HANDLE_PLACEHOLDERS,
): MetaTemplatePayload[] {
  return allShapes().map((shape) => metaTemplatePayload(shape, headerHandles));
}

/**
 * The category Meta gave each template, read on 2026-11-13. Meta moved three
 * Reminders submitted as Utility to Marketing; accepted, not fought (ADR 0053).
 * Category changes price and marketing caps, never rendering.
 */
export const META_GIVEN_CATEGORY: Readonly<Record<string, TemplateCategory>> = {
  event_reminder_kululu_today: 'MARKETING',
  event_reminder_kululu_today_tables_gift: 'MARKETING',
  event_reminder_kululu_dated: 'MARKETING',
};

/** The category a template is billed under: what Meta gave, else what was submitted. */
export function metaCategoryFor(shape: MessageShape): TemplateCategory {
  return (
    META_GIVEN_CATEGORY[templateNameFor(shape)] ?? submittedCategoryFor(shape)
  );
}
