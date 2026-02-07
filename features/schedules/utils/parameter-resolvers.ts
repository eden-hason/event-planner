import type { GuestApp } from '@/features/guests/schemas';
import type { GroupApp } from '@/features/guests/schemas';
import type { ScheduleApp } from '@/features/schedules/schemas';
import type {
  PlaceholderConfig,
  HeaderPlaceholderConfig,
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

  uppercase: (value: unknown) => String(value ?? '').toUpperCase(),

  lowercase: (value: unknown) => String(value ?? '').toLowerCase(),

  capitalize: (value: unknown) => {
    const str = String(value ?? '');
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
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

  optional: (value: unknown) => {
    // Only return value if it exists and is not empty
    if (value === null || value === undefined || value === '') {
      return '';
    }
    return String(value);
  },
};

/**
 * Resolve a single placeholder value using its configuration
 */
export function resolvePlaceholder(
  config: PlaceholderConfig,
  context: ParameterResolutionContext,
): string {
  // Extract value from context using source path
  const rawValue = getValueByPath(context as unknown as Record<string, unknown>, config.source);

  // Apply fallback if value is null/undefined
  if (rawValue === null || rawValue === undefined) {
    return config.fallback;
  }

  // Apply transformer
  const transformer = transformers[config.transformer] ?? transformers.none;
  const transformedValue = transformer(rawValue, config.transformerOptions as Record<string, unknown>);

  // Use fallback if transformed value is empty
  if (transformedValue === '') {
    return config.fallback;
  }

  return transformedValue;
}

/**
 * Build WhatsApp template parameters array from template body and configurations
 *
 * WhatsApp templates use numbered placeholders ({{1}}, {{2}}, {{3}}) which map
 * to parameters by position. This function counts placeholders in the template
 * and maps configs positionally: configs[0] → {{1}}, configs[1] → {{2}}, etc.
 */
export function buildDynamicTemplateParameters(
  templateBody: string,
  configs: PlaceholderConfig[],
  context: ParameterResolutionContext,
): Array<{ type: 'text'; text: string }> {
  // Count how many placeholders are in the template
  const placeholderRegex = /\{\{([^}]+)\}\}/g;
  const matches = Array.from(templateBody.matchAll(placeholderRegex));
  const placeholderCount = matches.length;

  // Validate we have enough configs
  if (configs.length < placeholderCount) {
    console.warn(
      `Template has ${placeholderCount} placeholders but only ${configs.length} configurations provided`
    );
  }

  // Use configs in order (positional matching)
  // WhatsApp templates use {{1}}, {{2}}, {{3}} which map to configs[0], configs[1], configs[2]
  const parameters = configs.slice(0, placeholderCount).map((config) => {
    const resolvedValue = resolvePlaceholder(config, context);
    return { type: 'text' as const, text: resolvedValue };
  });

  return parameters;
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
