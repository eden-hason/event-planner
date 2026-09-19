import type { GuestApp } from '@/features/guests/schemas';
import type { GroupApp } from '@/features/guests/schemas';
import type { EventApp } from '@/features/events/schemas';
import type {
  ScheduleApp,
  WhatsAppTemplateApp,
} from '@/features/schedules/schemas';
import type {
  PlaceholderConfig,
  NamedPlaceholderConfig,
  HeaderPlaceholderConfig,
  ButtonPlaceholderConfig,
  TransformerType,
  DateFormatOptions,
  CurrencyOptions,
} from '@/features/schedules/schemas/template-parameters';
// Deep import rather than the feature barrel: the barrel carries the RSVP
// page's client component, and this module runs in the send path and its tests.
import {
  rsvpNoPayload,
  rsvpYesPayload,
} from '@/features/confirmation/utils/conversation-ids';
import {
  buildApproachingLine,
  buildOccasionPhrase,
  buildTodayLine,
} from '@/features/events/utils/event-title';
export type MediaParameter =
  | { type: 'text'; text: string }
  | { type: 'image'; image: { link: string } }
  | { type: 'video'; video: { link: string } }
  | { type: 'document'; document: { link: string; filename?: string } };

/**
 * Context available for resolving template parameters
 * Note: event is a partial type to accommodate different query shapes
 */
export interface ParameterResolutionContext {
  guest: GuestApp;
  event: {
    id: string;
    userId: string;
    title: string;
    eventDate: string | null;
    [key: string]: unknown; // Allow additional fields
  };
  group?: GroupApp | null;
  /**
   * The guest's seating assignment, or null when they have none. Only the
   * reminder templates whose requires_table_numbers is true read this - and a
   * guest with no table is resolved onto the template that doesn't, so a null
   * here should never reach a {{n}} that needs it.
   */
  table?: { tableNumber: number; label: string | null } | null;
  schedule?: ScheduleApp;
  confirmationToken?: string;
}

/**
 * Extract a value from an object using dot notation path
 * @example getValueByPath({ guest: { name: 'John' } }, 'guest.name') => 'John'
 */
export function getValueByPath(
  obj: Record<string, unknown>,
  path: string,
): unknown {
  return path.split('.').reduce((current: unknown, key: string) => {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current === 'object' && current !== null) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * Transformer functions for formatting placeholder values
 */
type TransformerFunction = (
  value: unknown,
  options?: Record<string, unknown>,
) => string;

const transformers: Record<TransformerType, TransformerFunction> = {
  none: (value: unknown) => String(value ?? ''),

  // Meta rejects a body parameter holding a line break, a tab or more than
  // four spaces in a row (error 132018). Free text the Owner typed - the
  // organiser's note - can hold all three, so it is folded onto one line.
  singleLine: (value: unknown) =>
    String(value ?? '')
      .replace(/\s*[\r\n\t]+\s*/g, ' ')
      .replace(/ {2,}/g, ' ')
      .trim(),

  formatDate: (value: unknown, options?: Record<string, unknown>) => {
    if (!value) return '';

    const dateOptions = options as DateFormatOptions | undefined;
    const locale = dateOptions?.locale ?? 'en-US';
    const format = dateOptions?.format ?? 'long';
    // See DateFormatOptionsSchema: UTC keeps the rendered day stable across
    // runtimes rather than following whatever zone the code happens to run in.
    const timeZone = dateOptions?.timeZone ?? 'UTC';

    const date = new Date(value as string);
    if (isNaN(date.getTime())) return String(value);

    const formatOptionsMap: Record<string, Intl.DateTimeFormatOptions> = {
      short: { dateStyle: 'short' as const },
      medium: { dateStyle: 'medium' as const },
      long: { dateStyle: 'long' as const },
      full: { dateStyle: 'full' as const },
    };

    const formatOptions = formatOptionsMap[format] ?? formatOptionsMap.long;

    return new Intl.DateTimeFormat(locale, { ...formatOptions, timeZone }).format(
      date,
    );
  },

  rsvpLabel: (value: unknown) => {
    const statusMap: Record<string, string> = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      declined: 'Declined',
      tentative: 'Tentative',
    };
    const status = String(value ?? '').toLowerCase();
    return statusMap[status] ?? String(value);
  },

  currency: (value: unknown, options?: Record<string, unknown>) => {
    if (value === null || value === undefined) return '';

    const currencyOptions = options as CurrencyOptions | undefined;
    const currency = currencyOptions?.currency ?? 'USD';
    const locale = currencyOptions?.locale ?? 'en-US';

    const numValue =
      typeof value === 'number' ? value : parseFloat(String(value));
    if (isNaN(numValue)) return String(value);

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(numValue);
  },

  wazeNavQuery: (value: unknown) => {
    const str = String(value ?? '').trim();
    if (!str) return '';
    return `${encodeURIComponent(str)}&navigate=yes`;
  },

  navShortUrl: (value: unknown) => {
    const code = String(value ?? '').trim();
    if (!code) return '';
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_VERCEL_URL ||
      'http://localhost:3000';
    return `${siteUrl}/nav/${code}`;
  },

  reminderUrl: (value: unknown) => {
    const code = String(value ?? '').trim();
    if (!code) return '';
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_VERCEL_URL ||
      'http://localhost:3000';
    return `${siteUrl}/r/${code}`;
  },

  rsvpUrl: (value: unknown) => {
    const token = String(value ?? '').trim();
    if (!token) return '';
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_VERCEL_URL ||
      'http://localhost:3000';
    return `${siteUrl}/c/${token}`;
  },

  rsvpYesPayload: (value: unknown) => {
    const token = String(value ?? '').trim();
    return token ? rsvpYesPayload(token) : '';
  },

  rsvpNoPayload: (value: unknown) => {
    const token = String(value ?? '').trim();
    return token ? rsvpNoPayload(token) : '';
  },

  phoneNumber: (value: unknown) => {
    if (!value) return '';
    const phone = String(value);

    // Simple US phone number formatting (adjust as needed)
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length === 11 && cleaned[0] === '1') {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }

    return phone;
  },
};

/**
 * Resolve a single placeholder value using its configuration
 *
 * @param placeholderName - The placeholder name from the template (e.g., "guest.name")
 * @param config - The placeholder configuration
 * @param context - The resolution context with guest, event, group, schedule data
 */
export function resolvePlaceholder(
  placeholderName: string,
  config: PlaceholderConfig,
  context: ParameterResolutionContext,
): string {
  // Determine source path: use config.source if provided, otherwise use placeholder name
  const sourcePath = config.source ?? placeholderName;

  // Extract value from context using source path
  const rawValue = getValueByPath(
    context as unknown as Record<string, unknown>,
    sourcePath,
  );

  // Apply fallback if value is null/undefined
  if (rawValue === null || rawValue === undefined) {
    return '';
  }

  // Apply transformer
  const transformer = transformers[config.transformer] ?? transformers.none;
  const transformedValue = transformer(
    rawValue,
    config.transformerOptions as Record<string, unknown>,
  );

  // Use fallback if transformed value is empty
  if (transformedValue === '') {
    return '';
  }

  return transformedValue;
}

/**
 * Extract numeric placeholder indices from a template body
 *
 * Only matches numeric placeholders (e.g., {{1}}, {{2}}).
 *
 * @example extractPlaceholders("Hi {{1}}, event on {{2}}")
 * // Returns: ["1", "2"]
 */
export function extractPlaceholders(templateBody: string): string[] {
  const placeholderRegex = /\{\{(\d+)\}\}/g;
  const matches = Array.from(templateBody.matchAll(placeholderRegex));
  return matches.map((match) => match[1]);
}

/**
 * Build WhatsApp template parameters array from configurations
 *
 * WhatsApp templates use numeric placeholders ({{1}}, {{2}}, etc.).
 * Each config entry maps positionally to a numeric placeholder — the entry
 * at index 0 resolves {{1}}, index 1 resolves {{2}}, and so on.
 *
 * @param configs - Ordered placeholder configurations (array position defines position)
 * @param context - The resolution context with guest, event, group, schedule data
 * @returns Array of text parameters for WhatsApp API
 */
export function buildDynamicTemplateParameters(
  configs: NamedPlaceholderConfig[],
  context: ParameterResolutionContext,
): Array<{ type: 'text'; text: string }> {
  return configs.map((config) => {
    const resolvedValue = resolvePlaceholder(config.name, config, context);
    return { type: 'text' as const, text: resolvedValue };
  });
}

/**
 * Build WhatsApp header parameter from template configuration
 *
 * Resolves media URL from context and returns properly formatted
 * header parameter for Meta WhatsApp API.
 *
 * @returns Single media parameter or empty array if URL unavailable
 */
export function buildHeaderParameter(
  config: HeaderPlaceholderConfig,
  context: ParameterResolutionContext,
): MediaParameter[] {
  // Extract media URL from context using source path
  const rawValue = getValueByPath(
    context as unknown as Record<string, unknown>,
    config.source,
  );

  // Determine final URL from source
  let mediaUrl: string | null = null;

  if (rawValue && typeof rawValue === 'string' && rawValue.trim()) {
    mediaUrl = rawValue.trim();
  }

  // If no URL available and fallback is null, skip header
  if (!mediaUrl) {
    console.warn(
      `Header media URL not available for source: ${config.source}, skipping header`,
    );
    return [];
  }

  // Validate URL format
  try {
    new URL(mediaUrl);
  } catch {
    console.error(`Invalid URL for header parameter: ${mediaUrl}`);
    return [];
  }

  // Build parameter based on type
  switch (config.type) {
    case 'image':
      return [{ type: 'image', image: { link: mediaUrl } }];

    case 'video':
      return [{ type: 'video', video: { link: mediaUrl } }];

    case 'document':
      return [
        {
          type: 'document',
          document: {
            link: mediaUrl,
            ...(config.filename && { filename: config.filename }),
          },
        },
      ];

    default:
      console.error(`Unsupported header parameter type: ${config.type}`);
      return [];
  }
}

/**
 * Build all header parameters from template configuration
 *
 * @returns Array of header parameters (max 1 for WhatsApp)
 */
export function buildDynamicHeaderParameters(
  configs: HeaderPlaceholderConfig[],
  context: ParameterResolutionContext,
): MediaParameter[] {
  if (!configs || configs.length === 0) {
    return [];
  }

  // WhatsApp only supports 1 header parameter
  const config = configs[0];
  return buildHeaderParameter(config, context);
}

/**
 * A single button component entry for the Meta WhatsApp API.
 * Each dynamic button is a separate component in the `components` array.
 */
export interface ButtonComponent {
  type: 'button';
  sub_type: string;
  index: number;
  /**
   * A URL button takes text (the suffix appended to its approved base); a
   * quick reply takes a payload, which Meta hands back verbatim when the
   * Guest taps it.
   */
  parameters: Array<{ type: 'text'; text: string } | { type: 'payload'; payload: string }>;
}

/**
 * Build WhatsApp button parameter components from template configuration
 *
 * Each button config produces one component entry with resolved placeholder values.
 * Per Meta API spec, every dynamic button is a separate component.
 *
 * @param configs - Array of button placeholder configurations
 * @param context - The resolution context with guest, event, group, schedule data
 * @returns Array of button components for the Meta WhatsApp API
 */
export function buildDynamicButtonParameters(
  configs: ButtonPlaceholderConfig[],
  context: ParameterResolutionContext,
): ButtonComponent[] {
  return configs.map((config) => ({
    type: 'button' as const,
    sub_type: config.subType,
    index: config.index,
    parameters: config.placeholders.map((placeholder, idx) => {
      const resolved = resolvePlaceholder(String(idx), placeholder, context);
      return config.subType === 'quick_reply'
        ? { type: 'payload' as const, payload: resolved }
        : { type: 'text' as const, text: resolved };
    }),
  }));
}

/**
 * Resolve a template body for preview purposes.
 *
 * Guest/group placeholders are shown as labelled tokens (e.g. `[Name]`) because
 * no specific guest is selected at preview time. Event placeholders are resolved
 * against the provided event.
 */
/**
 * Sources that vary per recipient and so have no value to show in a preview -
 * they render as a bracketed label instead. `table.` is here because a guest's
 * seating assignment is per-guest data like their name, not an event field; the
 * preview would otherwise report the reminder as missing event details.
 */
function isPerGuestSource(source: string): boolean {
  return (
    source.startsWith('guest.') ||
    source.startsWith('group.') ||
    source.startsWith('table.')
  );
}

/**
 * Sources that live on the schedule instance rather than the event - just
 * the organiser's note today. Resolved directly from the value the caller
 * hands in rather than treated as "missing": an empty note is the normal
 * state of a without-note variant, not an event field nobody filled in.
 */
function isScheduleSource(source: string): boolean {
  return source.startsWith('schedule.');
}

/**
 * The preview holds an EventApp, which has no Occasion Phrase (or follow-up
 * opening lines) of its own - the send path builds both in mapEventRow. Derived the same way here so the preview
 * shows the phrase instead of reporting a missing event field.
 */
function withOccasionPhrase(event: EventApp | null): EventApp | null {
  if (!event) return null;
  return {
    ...event,
    occasionPhrase: buildOccasionPhrase({
      eventTypeKey: event.eventType,
      hostDetails: event.hostDetails as Record<string, unknown> | undefined,
    }),
    approachingLine: buildApproachingLine({
      eventTypeKey: event.eventType,
      hostDetails: event.hostDetails as Record<string, unknown> | undefined,
    }),
    todayLine: buildTodayLine({
      eventTypeKey: event.eventType,
      hostDetails: event.hostDetails as Record<string, unknown> | undefined,
    }),
  } as EventApp;
}

export function resolveSmsBodyForPreview(
  smsConfig: { bodyText: string; parameters?: { placeholders?: NamedPlaceholderConfig[] } },
  event: EventApp | null,
  customText?: string | null,
): { resolvedBody: string; hasMissingFields: boolean } {
  event = withOccasionPhrase(event);
  const placeholders = smsConfig.parameters?.placeholders;
  if (!placeholders || placeholders.length === 0) {
    return { resolvedBody: smsConfig.bodyText, hasMissingFields: false };
  }

  let hasMissingFields = false;
  const resolvedValues: string[] = [];
  const mockContext = {
    event: event ?? {},
    guest: {},
    schedule: { customText },
  } as unknown as ParameterResolutionContext;

  for (const config of placeholders) {
    const source = config.source ?? config.name;
    if (isPerGuestSource(source)) {
      const fieldName = source.split('.').pop() ?? source;
      resolvedValues.push(`[${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}]`);
    } else if (isScheduleSource(source)) {
      resolvedValues.push(resolvePlaceholder(config.name, config, mockContext) || '…');
    } else {
      const rawValue = event ? getValueByPath({ event }, source) : undefined;
      if (!rawValue) {
        hasMissingFields = true;
        resolvedValues.push('…');
      } else {
        resolvedValues.push(resolvePlaceholder(config.name, config, mockContext) || '…');
      }
    }
  }

  let resolvedBody = smsConfig.bodyText;
  resolvedValues.forEach((value, index) => {
    resolvedBody = resolvedBody.replaceAll(`{{${index + 1}}}`, value);
  });

  return { resolvedBody, hasMissingFields };
}

export function resolveTemplateBodyForPreview(
  template: WhatsAppTemplateApp,
  event: EventApp | null,
  customText?: string | null,
): { resolvedBody: string; hasMissingFields: boolean } {
  event = withOccasionPhrase(event);
  const placeholders = template.parameters?.placeholders;

  if (!placeholders || placeholders.length === 0) {
    return { resolvedBody: template.bodyText, hasMissingFields: false };
  }

  let hasMissingFields = false;
  const resolvedValues: string[] = [];
  const mockContext = {
    event: event ?? {},
    guest: {},
    schedule: { customText },
  } as unknown as ParameterResolutionContext;

  for (const config of placeholders) {
    const source = config.source ?? config.name;

    if (isPerGuestSource(source)) {
      const fieldName = source.split('.').pop() ?? source;
      const label = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
      resolvedValues.push(`[${label}]`);
    } else if (isScheduleSource(source)) {
      const resolved = resolvePlaceholder(config.name, config, mockContext);
      resolvedValues.push(resolved || '…');
    } else {
      const rawValue = event ? getValueByPath({ event }, source) : undefined;

      if (!rawValue) {
        hasMissingFields = true;
        resolvedValues.push('…');
      } else {
        const resolved = resolvePlaceholder(config.name, config, mockContext);
        resolvedValues.push(resolved || '…');
      }
    }
  }

  let resolvedBody = template.bodyText;
  resolvedValues.forEach((value, index) => {
    resolvedBody = resolvedBody.replaceAll(`{{${index + 1}}}`, value);
  });

  return { resolvedBody, hasMissingFields };
}
