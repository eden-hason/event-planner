import type { GuestApp } from '@/features/guests/schemas';
import type { GroupApp } from '@/features/guests/schemas';
import type { ScheduleApp } from '@/features/schedules/schemas';
import type {
  PlaceholderConfig,
  HeaderPlaceholderConfig,
  ButtonPlaceholderConfig,
  TransformerType,
  DateFormatOptions,
  CurrencyOptions,
} from '@/features/schedules/schemas/template-parameters';
import type { MediaParameter } from '@/features/schedules/utils';

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
    eventDate: string;
    [key: string]: unknown; // Allow additional fields
  };
  group?: GroupApp | null;
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

  formatDate: (value: unknown, options?: Record<string, unknown>) => {
    if (!value) return '';

    const dateOptions = options as DateFormatOptions | undefined;
    const locale = dateOptions?.locale ?? 'en-US';
    const format = dateOptions?.format ?? 'long';

    const date = new Date(value as string);
    if (isNaN(date.getTime())) return String(value);

    const formatOptionsMap: Record<string, Intl.DateTimeFormatOptions> = {
      short: { dateStyle: 'short' as const },
      medium: { dateStyle: 'medium' as const },
      long: { dateStyle: 'long' as const },
      full: { dateStyle: 'full' as const },
    };

    const formatOptions = formatOptionsMap[format] ?? formatOptionsMap.long;

    return new Intl.DateTimeFormat(locale, formatOptions).format(date);
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

    const numValue = typeof value === 'number' ? value : parseFloat(String(value));
    if (isNaN(numValue)) return String(value);

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(numValue);
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
  const rawValue = getValueByPath(context as unknown as Record<string, unknown>, sourcePath);

  // Determine fallback value (default to empty string if not specified)
  const fallbackValue = config.fallback ?? '';

  // Apply fallback if value is null/undefined
  if (rawValue === null || rawValue === undefined) {
    return fallbackValue;
  }

  // Apply transformer
  const transformer = transformers[config.transformer] ?? transformers.none;
  const transformedValue = transformer(rawValue, config.transformerOptions as Record<string, unknown>);

  // Use fallback if transformed value is empty
  if (transformedValue === '') {
    return fallbackValue;
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
  return matches.map(match => match[1]);
}

/**
 * Build WhatsApp template parameters array from configurations
 *
 * WhatsApp templates use numeric placeholders ({{1}}, {{2}}, etc.).
 * Each config entry maps positionally to a numeric placeholder — the first
 * entry resolves {{1}}, the second {{2}}, and so on.
 *
 * @param configs - Record mapping placeholder names to their configurations (insertion order defines position)
 * @param context - The resolution context with guest, event, group, schedule data
 * @returns Array of text parameters for WhatsApp API
 */
export function buildDynamicTemplateParameters(
  configs: Record<string, PlaceholderConfig>,
  context: ParameterResolutionContext,
): Array<{ type: 'text'; text: string }> {
  return Object.entries(configs).map(([placeholderName, config]) => {
    const resolvedValue = resolvePlaceholder(placeholderName, config, context);
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
    config.source
  );

  // Determine final URL (source or fallback)
  let mediaUrl: string | null = null;

  if (rawValue && typeof rawValue === 'string' && rawValue.trim()) {
    mediaUrl = rawValue.trim();
  } else if (config.fallback) {
    mediaUrl = config.fallback;
  }

  // If no URL available and fallback is null, skip header
  if (!mediaUrl) {
    console.warn(`Header media URL not available for source: ${config.source}, skipping header`);
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
      return [{
        type: 'document',
        document: {
          link: mediaUrl,
          ...(config.filename && { filename: config.filename }),
        },
      }];

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
  parameters: Array<{ type: 'text'; text: string }>;
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
      return { type: 'text' as const, text: resolved };
    }),
  }));
}
