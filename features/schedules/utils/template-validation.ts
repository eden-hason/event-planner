import type { PlaceholderConfig, TransformerType } from '@/features/schedules/schemas/template-parameters';
import { extractPlaceholders } from './parameter-resolvers';

/**
 * Validation error with severity level
 */
export interface ValidationIssue {
  type: 'error' | 'warning';
  message: string;
  placeholder?: string;
}

/**
 * Result of template validation
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

/**
 * Valid context paths that can be used in placeholders
 */
const VALID_CONTEXT_PATHS = [
  'guest.id',
  'guest.name',
  'guest.email',
  'guest.phone',
  'guest.rsvpStatus',
  'guest.dietaryRestrictions',
  'guest.notes',
  'guest.plusOneCount',
  'guest.groupId',
  'event.id',
  'event.userId',
  'event.title',
  'event.eventDate',
  'event.venueName',
  'event.location',
  'event.description',
  'group.id',
  'group.name',
  'group.description',
  'schedule.id',
  'schedule.name',
  'schedule.scheduledFor',
] as const;

/**
 * Check if a source path is valid dot-notation
 */
function isValidDotNotation(path: string): boolean {
  // Must be non-empty and contain only alphanumeric, dots, and underscores
  return /^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(path);
}

/**
 * Check if a source path is a known context path
 */
function isKnownContextPath(path: string): boolean {
  return VALID_CONTEXT_PATHS.includes(path as typeof VALID_CONTEXT_PATHS[number]);
}

/**
 * Validate transformer options match transformer type
 */
function validateTransformerOptions(
  transformer: TransformerType,
  options: Record<string, unknown> | undefined,
): ValidationIssue | null {
  if (!options) return null;

  switch (transformer) {
    case 'formatDate':
      if (options.locale && typeof options.locale !== 'string') {
        return { type: 'error', message: 'formatDate transformer: locale must be a string' };
      }
      if (options.format && !['short', 'medium', 'long', 'full'].includes(options.format as string)) {
        return { type: 'error', message: 'formatDate transformer: format must be short, medium, long, or full' };
      }
      break;

    case 'currency':
      if (options.currency && typeof options.currency !== 'string') {
        return { type: 'error', message: 'currency transformer: currency must be a string' };
      }
      if (options.locale && typeof options.locale !== 'string') {
        return { type: 'error', message: 'currency transformer: locale must be a string' };
      }
      break;

    case 'none':
    case 'rsvpLabel':
    case 'phoneNumber':
      // These transformers don't have options
      if (Object.keys(options).length > 0) {
        return { type: 'warning', message: `${transformer} transformer does not use options` };
      }
      break;

    default:
      return { type: 'warning', message: `Unknown transformer type: ${transformer}` };
  }

  return null;
}

/**
 * Validate template configuration
 *
 * Checks that:
 * 1. All placeholders in template have configs
 * 2. All configs are used in template
 * 3. Source paths are valid dot-notation
 * 4. Transformer options match transformer type
 *
 * @param bodyText - The template body text with placeholders
 * @param placeholders - Record mapping placeholder names to configurations
 * @returns Validation result with errors and warnings
 */
export function validateTemplateConfig(
  bodyText: string,
  placeholders: Record<string, PlaceholderConfig>,
): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // 1. Extract all placeholders from template
  const templatePlaceholders = extractPlaceholders(bodyText);

  // 2. Check for duplicate placeholders
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const placeholder of templatePlaceholders) {
    if (seen.has(placeholder)) {
      duplicates.add(placeholder);
    }
    seen.add(placeholder);
  }

  if (duplicates.size > 0) {
    warnings.push({
      type: 'warning',
      message: `Duplicate placeholders found: ${Array.from(duplicates).join(', ')}`,
    });
  }

  // 3. Check all placeholders have configs (or can use defaults)
  const uniquePlaceholders = [...new Set(templatePlaceholders)];
  const missingConfigs = uniquePlaceholders.filter(p => !placeholders[p]);

  if (missingConfigs.length > 0) {
    warnings.push({
      type: 'warning',
      message: `Missing configs for placeholders (will use defaults): ${missingConfigs.join(', ')}`,
    });
  }

  // 4. Check all configs are used in template
  const configKeys = Object.keys(placeholders);
  const unusedConfigs = configKeys.filter(key => !uniquePlaceholders.includes(key));

  if (unusedConfigs.length > 0) {
    warnings.push({
      type: 'warning',
      message: `Unused configs found: ${unusedConfigs.join(', ')}`,
    });
  }

  // 5. Validate each config
  for (const [placeholderName, config] of Object.entries(placeholders)) {
    // Determine source path
    const sourcePath = config.source ?? placeholderName;

    // Validate source path is valid dot-notation
    if (!isValidDotNotation(sourcePath)) {
      errors.push({
        type: 'error',
        message: `Invalid source path format: "${sourcePath}"`,
        placeholder: placeholderName,
      });
      continue;
    }

    // Warn if source path is not a known context path
    if (!isKnownContextPath(sourcePath)) {
      warnings.push({
        type: 'warning',
        message: `Unknown context path: "${sourcePath}" (may not resolve at runtime)`,
        placeholder: placeholderName,
      });
    }

    // Validate transformer options
    const transformerIssue = validateTransformerOptions(
      config.transformer,
      config.transformerOptions as Record<string, unknown> | undefined,
    );

    if (transformerIssue) {
      const issue = { ...transformerIssue, placeholder: placeholderName };
      if (transformerIssue.type === 'error') {
        errors.push(issue);
      } else {
        warnings.push(issue);
      }
    }
  }

  // 6. Return validation result
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Format validation issues for display
 */
export function formatValidationIssues(result: ValidationResult): string {
  const lines: string[] = [];

  if (result.errors.length > 0) {
    lines.push('Errors:');
    for (const error of result.errors) {
      const prefix = error.placeholder ? `  [${error.placeholder}] ` : '  ';
      lines.push(`${prefix}${error.message}`);
    }
  }

  if (result.warnings.length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push('Warnings:');
    for (const warning of result.warnings) {
      const prefix = warning.placeholder ? `  [${warning.placeholder}] ` : '  ';
      lines.push(`${prefix}${warning.message}`);
    }
  }

  return lines.join('\n');
}
