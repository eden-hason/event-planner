import type { ParameterResolutionContext } from '../utils/parameter-resolvers';
import { buildDynamicTemplateParameters } from '../utils/parameter-resolvers';
import { getTemplateByKey } from './whatsapp-templates';

function resolveSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    'http://localhost:3000'
  );
}

const SMS_CONFIRMATION_BODY =
  'היי אורחים יקרים\nהחתונה של {{1}} ו{{2}} מתקרבת, נשמח לדעת אם תגיעו.\n\n📅 {{3}}\n📍 {{4}}\n\nמחכים לחגוג איתכם ❤️\nלאישור הגעה, לחצו על הקישור 👇🏼';

export function buildSmsConfirmationBody(
  context: ParameterResolutionContext,
  confirmationToken: string,
): string {
  const siteUrl = resolveSiteUrl();
  const rsvpLink = `${siteUrl}/confirm/${confirmationToken}`;

  const placeholders = getTemplateByKey('confirmation_casual_v1_he')?.whatsapp.parameters?.placeholders;
  if (!placeholders) {
    console.error('[SMS] Failed to resolve placeholders for confirmation_casual_v1_he');
    throw new Error('SMS template resolution failed');
  }

  const params = buildDynamicTemplateParameters(placeholders, context);
  let body = SMS_CONFIRMATION_BODY;
  params.forEach((param, i) => {
    body = body.replace(`{{${i + 1}}}`, param.text);
  });
  return `${body}\n${rsvpLink}`;
}

export function buildSmsReminderBody(context: ParameterResolutionContext): string {
  const smsConfig = getTemplateByKey('event_reminder_casual')?.sms;
  if (!smsConfig?.parameters?.placeholders) {
    console.error('[SMS] Failed to resolve SMS config for event_reminder_casual');
    throw new Error('SMS reminder template resolution failed');
  }

  const params = buildDynamicTemplateParameters(smsConfig.parameters.placeholders, context);
  let body = smsConfig.bodyText;
  params.forEach((param, i) => {
    body = body.replace(`{{${i + 1}}}`, param.text);
  });

  return body;
}
