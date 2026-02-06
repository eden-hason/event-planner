/**
 * Database Schema Documentation Generator
 *
 * Fetches the OpenAPI spec from the live Supabase project and generates
 * a comprehensive markdown document at docs/database-schema.md.
 *
 * Usage: npm run generate:db-docs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------------------------------------------------------------------------
// 1. Load environment variables from .env.local
// ---------------------------------------------------------------------------

function loadEnv(): { url: string; key: string } {
  const envPath = resolve(__dirname, '..', '.env.local');
  let content: string;
  try {
    content = readFileSync(envPath, 'utf-8');
  } catch {
    console.error('Error: .env.local not found. Copy .env.example to .env.local and fill in your values.');
    process.exit(1);
  }

  const vars: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }

  const url = vars['NEXT_PUBLIC_SUPABASE_URL'];
  const key = vars['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'];

  if (!url || !key) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set in .env.local');
    process.exit(1);
  }

  return { url, key };
}

// ---------------------------------------------------------------------------
// 2. Fetch OpenAPI spec
// ---------------------------------------------------------------------------

interface OpenAPISpec {
  definitions?: Record<string, TableDefinition>;
  paths?: Record<string, PathItem>;
}

interface TableDefinition {
  description?: string;
  properties?: Record<string, ColumnDef>;
  required?: string[];
}

interface ColumnDef {
  type?: string;
  format?: string;
  description?: string;
  default?: unknown;
  maxLength?: number;
  enum?: string[];
}

interface PathItem {
  get?: { parameters?: Parameter[] };
  post?: { parameters?: Parameter[] };
}

interface Parameter {
  name: string;
  in: string;
  description?: string;
  format?: string;
  type?: string;
  enum?: string[];
}

async function fetchOpenAPISpec(url: string, key: string): Promise<OpenAPISpec> {
  const endpoint = `${url}/rest/v1/`;
  console.log(`Fetching OpenAPI spec from ${endpoint} ...`);

  const res = await fetch(endpoint, {
    headers: {
      apikey: key,
      Accept: 'application/openapi+json',
    },
  });

  if (!res.ok) {
    console.error(`Error: Failed to fetch OpenAPI spec (${res.status} ${res.statusText})`);
    process.exit(1);
  }

  return (await res.json()) as OpenAPISpec;
}

// ---------------------------------------------------------------------------
// 3. Parse the spec
// ---------------------------------------------------------------------------

interface ParsedColumn {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue: string | null;
  maxLength: number | null;
  enumValues: string[] | null;
  description: string | null;
  isPrimaryKey: boolean;
  foreignKey: { table: string; column: string } | null;
}

interface ParsedTable {
  name: string;
  description: string | null;
  columns: ParsedColumn[];
}

interface ParsedEnum {
  name: string;
  values: string[];
}

/** Column order for tables where we want a specific order (matching original docs). */
const TABLE_ORDER = [
  'profiles',
  'events',
  'guests',
  'groups',
  'schedules',
  'whatsapp_templates',
  'message_deliveries',
  'guest_interactions',
];

function parseSpec(spec: OpenAPISpec): { tables: ParsedTable[]; enums: ParsedEnum[] } {
  const definitions = spec.definitions ?? {};
  const enumMap = new Map<string, ParsedEnum>();
  const tables: ParsedTable[] = [];

  for (const [tableName, def] of Object.entries(definitions)) {
    const props = def.properties ?? {};
    const required = new Set(def.required ?? []);
    const columns: ParsedColumn[] = [];

    for (const [colName, colDef] of Object.entries(props)) {
      // Determine type
      let type = resolveType(colDef);

      // Check if this is an enum (PostgREST puts enum values in `enum` array
      // and the enum type name in `format`, e.g. `public."RSVP_STATUS"` or `public.message_type`)
      let enumValues: string[] | null = null;
      if (colDef.enum && colDef.enum.length > 0) {
        enumValues = colDef.enum;

        // Extract enum name from format field (e.g. `public."RSVP_STATUS"` -> `"RSVP_STATUS"`)
        const enumName = extractEnumName(colDef.format);
        if (enumName) {
          type = enumName;
          if (!enumMap.has(enumName)) {
            enumMap.set(enumName, { name: enumName, values: enumValues });
          }
        }
      }

      // Detect FK from description
      const fk = extractForeignKey(colDef.description);

      // Detect PK
      const isPK = colDef.description?.includes('<pk') ?? false;

      // Detect default
      const defaultValue = extractDefault(colDef);

      // Nullable: a column is nullable if it is NOT in the required array
      const nullable = !required.has(colName);

      columns.push({
        name: colName,
        type,
        nullable,
        defaultValue,
        maxLength: colDef.maxLength ?? null,
        enumValues,
        description: colDef.description ?? null,
        isPrimaryKey: isPK,
        foreignKey: fk,
      });
    }

    // Cross-schema FKs not reported by PostgREST (e.g. events.user_id -> auth.users.id)
    const crossSchemaFKs = new Set(['events.user_id', 'profiles.id']);
    const isFKLike = (col: ParsedColumn) =>
      col.foreignKey != null || crossSchemaFKs.has(`${tableName}.${col.name}`);

    // Sort columns: PK first, then FKs, then rest alphabetically, with created_at/updated_at last
    columns.sort((a, b) => {
      if (a.isPrimaryKey && !b.isPrimaryKey) return -1;
      if (!a.isPrimaryKey && b.isPrimaryKey) return 1;
      const aIsTimestamp = a.name === 'created_at' || a.name === 'updated_at';
      const bIsTimestamp = b.name === 'created_at' || b.name === 'updated_at';
      if (aIsTimestamp && !bIsTimestamp) return 1;
      if (!aIsTimestamp && bIsTimestamp) return -1;
      if (aIsTimestamp && bIsTimestamp) {
        return a.name === 'created_at' ? -1 : 1;
      }
      // FKs near top (after PK)
      const aFK = isFKLike(a);
      const bFK = isFKLike(b);
      if (aFK && !bFK) return -1;
      if (!aFK && bFK) return 1;
      return a.name.localeCompare(b.name);
    });

    tables.push({
      name: tableName,
      description: def.description ?? null,
      columns,
    });
  }

  // Sort tables according to TABLE_ORDER, unknown tables at the end
  tables.sort((a, b) => {
    const ai = TABLE_ORDER.indexOf(a.name);
    const bi = TABLE_ORDER.indexOf(b.name);
    if (ai === -1 && bi === -1) return a.name.localeCompare(b.name);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  // Sort enums by name
  const enums = [...enumMap.values()].sort((a, b) => a.name.localeCompare(b.name));

  return { tables, enums };
}

function resolveType(col: ColumnDef): string {
  const format = col.format;
  const type = col.type;

  // Enum columns have format like `public."RSVP_STATUS"` or `public.message_type`
  // and an `enum` array — these will be handled separately, return a placeholder
  if (col.enum && col.enum.length > 0 && format?.startsWith('public.')) {
    return format; // Will be overwritten by enum handling in parseSpec
  }

  if (format === 'uuid') return 'uuid';
  if (format === 'timestamp with time zone' || format === 'timestamptz') return 'timestamptz';
  if (format === 'time without time zone' || format === 'time') return 'time';
  if (format === 'jsonb') return 'jsonb';
  if (format === 'boolean' || type === 'boolean') return 'boolean';
  if (format === 'integer' || format === 'int4') return 'integer';
  if (format === 'bigint' || format === 'int8') return 'bigint';
  if (format === 'text') return 'text';
  if (format === 'character varying') return 'varchar';

  // Fallback
  if (type === 'string') return format ?? 'text';
  if (type === 'integer') return 'integer';
  if (type === 'number') return 'numeric';
  if (type === 'boolean') return 'boolean';

  return format ?? type ?? 'unknown';
}

/**
 * Extracts the enum type name from a PostgREST format string.
 * Examples:
 *   `public."RSVP_STATUS"` -> `"RSVP_STATUS"`
 *   `public.message_type`  -> `message_type`
 */
function extractEnumName(format?: string): string | null {
  if (!format) return null;
  // Match `public."EnumName"` (quoted) or `public.enum_name` (unquoted)
  const match = format.match(/^public\."?([^"]+)"?$/);
  if (match) return match[1];
  return null;
}

function extractForeignKey(desc?: string): { table: string; column: string } | null {
  if (!desc) return null;

  // PostgREST description format: "Note:\nThis is a Foreign Key to `tablename.column`."
  const match = desc.match(/Foreign Key to `(\w+)\.(\w+)`/i);
  if (match) {
    return { table: match[1], column: match[2] };
  }
  return null;
}

function extractDefault(col: ColumnDef): string | null {
  if (col.default === undefined || col.default === null) return null;
  const val = String(col.default);
  if (val === '') return null;

  // Known function calls — keep as-is
  if (val === 'now()' || val === 'gen_random_uuid()') return val;

  // Booleans — keep as-is
  if (val === 'true' || val === 'false') return val;

  // Numbers — keep as-is
  if (!isNaN(Number(val))) return val;

  // String defaults — wrap in single quotes to match SQL convention
  if (!val.startsWith("'")) return `'${val}'`;

  return val;
}

// ---------------------------------------------------------------------------
// 4. Generate markdown
// ---------------------------------------------------------------------------

function generateMarkdown(tables: ParsedTable[], enums: ParsedEnum[]): string {
  const now = new Date().toISOString().slice(0, 10);
  const lines: string[] = [];

  const push = (...args: string[]) => {
    for (const l of args) lines.push(l);
  };

  // Header
  push(
    '# Database Schema Documentation',
    '',
    `> **Last Updated:** ${now}`,
    '>',
    '> **How to regenerate:** Run the following command from the project root:',
    '>',
    '> ```bash',
    '> npm run generate:db-docs',
    '> ```',
    '>',
    '> For RLS policies, indexes, functions, and triggers, query `information_schema` and `pg_catalog` using the **service role key** via the Supabase SQL Editor or CLI.',
    '',
    '---',
    '',
  );

  // Table of Contents
  push('## Table of Contents', '');
  push('1. [Overview](#overview)');
  push('2. [Entity Relationship Diagram](#entity-relationship-diagram)');
  push('3. [Enum Types](#enum-types)');
  push('4. [Tables](#tables)');
  for (const t of tables) {
    push(`   - [${t.name}](#${t.name})`);
  }
  push('5. [Foreign Key Relationships](#foreign-key-relationships)');
  push('6. [JSONB Column Structures](#jsonb-column-structures)');
  push('7. [Row Level Security (RLS) Policies](#row-level-security-rls-policies)');
  push('8. [Indexes](#indexes)');
  push('9. [Database Functions & Triggers](#database-functions--triggers)');
  push('', '---', '');

  // Overview
  push('## Overview', '');
  push(
    `The database uses **PostgreSQL** (hosted on Supabase) and consists of **${tables.length} tables** in the \`public\` schema:`,
    '',
  );
  push('| Table | Description | Primary Use |');
  push('|---|---|---|');

  // Table descriptions from paths summaries or hardcoded where OpenAPI doesn't provide them
  const tableDescOverrides: Record<string, string> = {
    profiles: 'User profile data linked to Supabase Auth',
    events: 'Core event records (weddings, birthdays, etc.)',
    guests: 'Guest list per event',
    groups: 'Guest groupings (e.g., bride\'s side, work friends)',
  };

  const primaryUseMap: Record<string, string> = {
    profiles: 'User management',
    events: 'Event CRUD',
    guests: 'Guest management',
    groups: 'Guest organization',
    schedules: 'Messaging automation',
    message_templates: 'Message content',
    message_deliveries: 'Delivery analytics',
    guest_interactions: 'Engagement tracking',
  };

  for (const t of tables) {
    const desc = tableDescOverrides[t.name] ?? t.description ?? '';
    const use = primaryUseMap[t.name] ?? '';
    push(`| \`${t.name}\` | ${desc} | ${use} |`);
  }

  push('');
  push('Authentication is handled by **Supabase Auth** (`auth.users`), which is separate from the `public` schema.');
  push('', '---', '');

  // ERD (hardcoded – structural, not derivable from OpenAPI)
  push('## Entity Relationship Diagram', '');
  push('```');
  push('auth.users');
  push('    |');
  push('    | 1:1 (id)');
  push('    v');
  push('profiles');
  push('    |');
  push('    | (user_id)');
  push('    |');
  push('    v');
  push('events ─────────────────────────────────┐');
  push('    |                                    |');
  push('    | 1:N (event_id)                     | 1:N (event_id)');
  push('    v                                    v');
  push('groups                               schedules ──────────────┐');
  push('    |                                    |                    |');
  push('    | 1:N (group_id)                     | N:1 (template_id)  |');
  push('    v                                    v                    |');
  push('guests                           message_templates            |');
  push('    |                                                         |');
  push('    |  ┌──────────────────────────────────────────────────────┘');
  push('    |  |');
  push('    |  | 1:N (schedule_id, guest_id)');
  push('    v  v');
  push('message_deliveries');
  push('guest_interactions');
  push('```');
  push('', '---', '');

  // Enum Types
  push('## Enum Types', '');
  push('The database defines the following custom PostgreSQL enum types:');
  push('');

  if (enums.length > 0) {
    for (const e of enums) {
      push(`### \`public.${e.name}\``, '');
      push('| Value |');
      push('|---|');
      for (const v of e.values) {
        push(`| \`${v}\` |`);
      }
      push('');
    }
  } else {
    // Fallback: extract enums from column definitions
    const seenEnums = new Map<string, string[]>();
    for (const t of tables) {
      for (const c of t.columns) {
        if (c.enumValues && c.enumValues.length > 0) {
          const enumName = c.type !== 'text' ? c.type : c.name;
          if (!seenEnums.has(enumName)) {
            seenEnums.set(enumName, c.enumValues);
          }
        }
      }
    }
    for (const [name, values] of seenEnums) {
      push(`### \`public.${name}\``, '');
      push('| Value |');
      push('|---|');
      for (const v of values) {
        push(`| \`${v}\` |`);
      }
      push('');
    }
  }

  push('---', '');

  // Tables
  push('## Tables', '');

  // Table-specific notes
  const tableNotes: Record<string, string[]> = {
    profiles: [
      'The `id` column maps directly to `auth.users.id` (set on user creation, not auto-generated).',
      '',
      '**Note:** Currently not queried by the application code. User data is read from `auth.users` metadata via `supabase.auth.getUser()`.',
    ],
    message_deliveries: ['**Note:** Not currently queried by the application code (schema defined for future use).'],
    guest_interactions: ['**Note:** Not currently queried by the application code (schema defined for future use).'],
  };

  // Column-specific notes
  const columnNotes: Record<string, Record<string, string>> = {
    profiles: {
      id: 'References `auth.users.id`',
    },
    events: {
      user_id: 'Owner of the event',
      event_type: 'Free-text (not enum)',
      status: 'Values: `draft`, `published`, `archived`',
      reception_time: 'Time string',
      ceremony_time: 'Time string',
      location: 'See [JSONB structures](#location)',
      event_settings: 'See [JSONB structures](#event_settings)',
      host_details: 'See [JSONB structures](#host_details)',
      invitations: 'See [JSONB structures](#invitations)',
      is_default: "User's default event",
    },
    guests: {
      amount: 'Number of seats/attendees',
    },
    groups: {
      icon: 'Icon identifier from `GROUP_ICONS`',
      side: '`bride` or `groom`',
    },
    schedules: {
      scheduled_date: 'When to send',
      sent_at: 'Actual send time',
      target_filter: 'See [JSONB structures](#target_filter)',
      custom_content: 'See [JSONB structures](#custom_content)',
    },
    message_templates: {
      name: 'Template display name',
      subject: 'Email subject line',
      body_template: 'Main message body',
      whatsapp_template: 'WhatsApp-specific body',
      cta_text: 'Call-to-action button text',
      default_days_offset: 'Days before/after event to send',
      default_time: 'Default send time',
      is_system: 'System-provided template',
      is_default: 'Default template for its type',
      created_by: 'User who created (null for system)',
    },
    message_deliveries: {
      response_data: 'See [JSONB structures](#response_data)',
      whatsapp_message_id: 'Twilio/WhatsApp message ID',
      error_message: 'Error details on failure',
    },
    guest_interactions: {
      metadata: 'See [JSONB structures](#interaction-metadata)',
    },
  };

  // Table descriptions for individual table headers
  const tableHeaderDescs: Record<string, string> = {
    profiles: 'Stores public profile information for each user.',
    events: 'Core table for all event types (weddings, birthdays, corporate events, etc.).',
    guests: 'Stores the guest list for each event with RSVP tracking.',
    groups: 'Guest grouping for organization (e.g., bride\'s side, groom\'s side, work friends).',
    schedules: 'Stores scheduled messages for events with timing and targeting configuration.',
    message_templates: 'Stores message templates for different event types and message stages.',
    message_deliveries: 'Tracks individual message delivery status per guest.',
    guest_interactions: 'Records all guest interactions with messages for detailed analytics.',
  };

  for (const t of tables) {
    push(`### \`${t.name}\``, '');
    const headerDesc = tableHeaderDescs[t.name] ?? t.description;
    if (headerDesc) {
      push(`> ${headerDesc}`, '');
    }

    // Pre-table notes
    const notes = tableNotes[t.name];
    if (notes) {
      // Print notes before the table that aren't the trailing **Note:**
      const preNotes = notes.filter((n) => !n.startsWith('**Note:**'));
      if (preNotes.length > 0 && preNotes.some((n) => n.length > 0)) {
        for (const n of preNotes) push(n);
        push('');
      }
    }

    push('| Column | Type | Nullable | Default | Constraints | Notes |');
    push('|---|---|---|---|---|---|');

    for (const c of t.columns) {
      const colNotes = columnNotes[t.name]?.[c.name];
      const nullable = c.nullable ? 'YES' : '**NO**';

      // Format type with maxLength
      let typeStr = formatType(c);

      // Constraints
      const constraints: string[] = [];
      if (c.isPrimaryKey) constraints.push('**PK**');
      if (c.foreignKey) {
        constraints.push(`**FK** -> \`${c.foreignKey.table}.${c.foreignKey.column}\``);
      }
      // Hardcoded cross-schema FKs not reported by PostgREST
      if (t.name === 'events' && c.name === 'user_id') {
        constraints.push('**FK** -> `auth.users.id`');
      }
      const constraintStr = constraints.join(', ');

      // Default
      const defaultStr = c.defaultValue ? `\`${c.defaultValue}\`` : '-';

      // Notes
      let noteStr = '';
      if (colNotes) {
        noteStr = colNotes;
      } else if (c.enumValues && c.enumValues.length > 0 && c.type !== 'text') {
        noteStr = `Enum: \`${c.enumValues.join('`, `')}\``;
      }

      push(`| \`${c.name}\` | \`${typeStr}\` | ${nullable} | ${defaultStr} | ${constraintStr} | ${noteStr} |`);
    }

    // Post-table notes
    if (notes) {
      const postNotes = notes.filter((n) => n.startsWith('**Note:**'));
      if (postNotes.length > 0) {
        push('');
        for (const n of postNotes) push(n);
      }
    }

    push('', '---', '');
  }

  // Foreign Key Relationships
  push('## Foreign Key Relationships', '');
  push('| Source Table | Source Column | Target Table | Target Column | On Delete |');
  push('|---|---|---|---|---|');

  // Hardcoded auth.users FKs (not in OpenAPI)
  push('| `profiles` | `id` | `auth.users` | `id` | (implied) |');
  push('| `events` | `user_id` | `auth.users` | `id` | (implied) |');

  // From parsed data
  for (const t of tables) {
    for (const c of t.columns) {
      if (c.foreignKey) {
        push(`| \`${t.name}\` | \`${c.name}\` | \`${c.foreignKey.table}\` | \`${c.foreignKey.column}\` | - |`);
      }
    }
  }

  push('', '---', '');

  // JSONB Column Structures (hardcoded – not in OpenAPI)
  push('## JSONB Column Structures', '');
  push(
    'These columns store structured JSON data. The expected shapes are defined by Zod schemas in the application code.',
  );
  push('');

  push('### `location`', '');
  push('_Table: `events`_', '');
  push('```jsonc');
  push('{');
  push('  "name": "Venue Name",           // string, required');
  push('  "coords": {                     // optional');
  push('    "lat": 32.0853,               // number');
  push('    "lng": 34.7818                // number');
  push('  }');
  push('}');
  push('```');
  push('');

  push('### `event_settings`', '');
  push('_Table: `events`_', '');
  push('```jsonc');
  push('{');
  push('  "paybox_config": {              // optional');
  push('    "enabled": true,              // boolean');
  push('    "link": "https://..."         // string');
  push('  },');
  push('  "bit_config": {                 // optional');
  push('    "enabled": true,              // boolean');
  push('    "phoneNumber": "0501234567"   // string');
  push('  }');
  push('}');
  push('```');
  push('');

  push('### `host_details`', '');
  push('_Table: `events`_', '');
  push('```jsonc');
  push('// Wedding-specific host details');
  push('{');
  push('  "bride": {                      // optional');
  push('    "name": "Name",               // string, optional');
  push('    "parents": "Parent Names"     // string, optional');
  push('  },');
  push('  "groom": {                      // optional');
  push('    "name": "Name",               // string, optional');
  push('    "parents": "Parent Names"     // string, optional');
  push('  }');
  push('}');
  push('```');
  push('');

  push('### `invitations`', '');
  push('_Table: `events`_', '');
  push('```jsonc');
  push('{');
  push('  "front_image_url": "https://...",  // string, optional');
  push('  "back_image_url": "https://..."    // string, optional');
  push('}');
  push('```');
  push('');

  push('### `target_filter`', '');
  push('_Table: `schedules`_', '');
  push('```jsonc');
  push('{');
  push('  "guestStatus": ["pending", "confirmed"],  // array of RSVP_STATUS values, optional');
  push('  "tags": ["family", "vip"],                // array of strings, optional');
  push('  "groupIds": ["uuid-1", "uuid-2"]          // array of group UUIDs, optional');
  push('}');
  push('```');
  push('');

  push('### `custom_content`', '');
  push('_Table: `schedules`_', '');
  push('```jsonc');
  push('{');
  push('  "subject": "Custom subject line",    // string, optional');
  push('  "body": "Custom message body",       // string, optional');
  push('  "whatsappBody": "WhatsApp version",  // string, optional');
  push('  "ctaText": "Click here",             // string, optional');
  push('  "ctaUrl": "https://..."              // URL string, optional');
  push('}');
  push('```');
  push('');

  push('### `response_data`', '');
  push('_Table: `message_deliveries`_', '');
  push('```jsonc');
  push('{');
  push('  "guestCount": 2,                        // integer, optional');
  push('  "dietaryRestrictions": "Vegetarian",    // string, optional');
  push('  "notes": "Looking forward to it"        // string, optional');
  push('}');
  push('```');
  push('');

  push('### Interaction Metadata', '');
  push('_Table: `guest_interactions`_', '');
  push('```jsonc');
  push('{');
  push('  "guestCount": 2,                     // integer, optional');
  push('  "dietaryRestrictions": "Vegan",      // string, optional');
  push('  "linkClicked": "https://...",        // string, optional');
  push('  "userAgent": "Mozilla/5.0..."        // string, optional');
  push('}');
  push('```');
  push('');

  push('---', '');

  // RLS Policies
  push('## Row Level Security (RLS) Policies', '');
  push(
    'RLS is enabled on all tables. Policies enforce data ownership at the database level, meaning the application code does **not** perform manual `user_id` checks.',
  );
  push('');
  push('> **To enumerate the exact RLS policies**, run the following SQL in the Supabase SQL Editor:');
  push('>');
  push('> ```sql');
  push('> SELECT');
  push('>   schemaname,');
  push('>   tablename,');
  push('>   policyname,');
  push('>   permissive,');
  push('>   roles,');
  push('>   cmd,');
  push('>   qual,');
  push('>   with_check');
  push('> FROM pg_policies');
  push("> WHERE schemaname = 'public'");
  push('> ORDER BY tablename, policyname;');
  push('> ```');
  push('');

  push('### Expected RLS Patterns', '');
  push('Based on the application architecture, the following RLS patterns are expected:', '');

  push('**`profiles`**');
  push('- Users can read/update their own profile (`id = auth.uid()`)');
  push('');
  push('**`events`**');
  push('- Users can CRUD their own events (`user_id = auth.uid()`)');
  push('');
  push('**`guests`, `groups`**');
  push('- Access is scoped through `event_id` to events owned by the current user');
  push('- Likely uses a subquery: `event_id IN (SELECT id FROM events WHERE user_id = auth.uid())`');
  push('');
  push('**`schedules`**');
  push('- Access scoped through `event_id` to events owned by the current user');
  push('');
  push('**`message_templates`**');
  push('- System templates (`is_system = true`) are readable by all authenticated users');
  push('- User-created templates scoped by `created_by = auth.uid()`');
  push('');
  push('**`message_deliveries`, `guest_interactions`**');
  push('- Access scoped through the schedule -> event ownership chain');
  push('');

  push('---', '');

  // Indexes
  push('## Indexes', '');
  push('> **To enumerate all indexes**, run the following SQL in the Supabase SQL Editor:');
  push('>');
  push('> ```sql');
  push('> SELECT');
  push('>   schemaname,');
  push('>   tablename,');
  push('>   indexname,');
  push('>   indexdef');
  push('> FROM pg_indexes');
  push("> WHERE schemaname = 'public'");
  push('> ORDER BY tablename, indexname;');
  push('> ```');
  push('');

  push('### Expected Indexes', '');
  push('At minimum, PostgreSQL automatically creates indexes for:', '');
  push('- **Primary keys**: `{table}_pkey` on `id` for every table');
  push(
    '- **Foreign keys**: Indexes on all FK columns listed in [Foreign Key Relationships](#foreign-key-relationships) are recommended for join performance',
  );
  push('');

  push('### Commonly Useful Indexes', '');
  push('| Table | Column(s) | Rationale |');
  push('|---|---|---|');
  push('| `events` | `user_id` | Filter events by owner |');
  push('| `guests` | `event_id` | List guests for an event |');
  push('| `guests` | `group_id` | List guests in a group |');
  push('| `groups` | `event_id` | List groups for an event |');
  push('| `schedules` | `event_id` | List schedules for an event |');
  push('| `schedules` | `template_id` | Join with templates |');
  push('| `message_deliveries` | `schedule_id` | List deliveries for a schedule |');
  push('| `message_deliveries` | `guest_id` | Delivery history for a guest |');
  push('| `guest_interactions` | `guest_id` | Interaction history for a guest |');
  push('| `guest_interactions` | `schedule_id` | Interactions for a schedule |');
  push('');

  push('---', '');

  // Functions & Triggers
  push('## Database Functions & Triggers', '');
  push('> **To enumerate all functions and triggers**, run the following SQL:');
  push('>');
  push('> ```sql');
  push('> -- Functions');
  push('> SELECT routine_name, routine_type, data_type');
  push('> FROM information_schema.routines');
  push("> WHERE routine_schema = 'public'");
  push('> ORDER BY routine_name;');
  push('>');
  push('> -- Triggers');
  push('> SELECT');
  push('>   trigger_name,');
  push('>   event_manipulation,');
  push('>   event_object_table,');
  push('>   action_statement');
  push('> FROM information_schema.triggers');
  push("> WHERE trigger_schema = 'public'");
  push('> ORDER BY event_object_table, trigger_name;');
  push('> ```');
  push('');

  push('### Known/Expected Functions', '');
  push(
    'Based on the default values using `now()` and `gen_random_uuid()`, these are PostgreSQL built-in functions. No custom RPC functions are exposed via the REST API.',
  );
  push('');

  push('### Expected Triggers', '');
  push('| Table | Trigger | Event | Purpose |');
  push('|---|---|---|---|');
  push(
    '| `profiles` | `on_auth_user_created` | AFTER INSERT on `auth.users` | Auto-create profile row for new users |',
  );
  push('| All tables with `updated_at` | `set_updated_at` | BEFORE UPDATE | Auto-update `updated_at` timestamp |');
  push('');
  push(
    '> **Note:** These are common Supabase patterns but have not been verified against the actual database. Use the SQL queries above to confirm.',
  );
  push('');

  push('---', '');

  // App-to-Database Field Mapping
  push('## App-to-Database Field Mapping', '');
  push(
    'The application uses **camelCase** in TypeScript and **snake_case** in the database. Zod schemas handle the transformation. Key mappings:',
  );
  push('');
  push('| App Field (camelCase) | DB Column (snake_case) | Table |');
  push('|---|---|---|');

  // Generate mappings from parsed tables
  for (const t of tables) {
    for (const c of t.columns) {
      if (c.name.includes('_')) {
        const camel = snakeToCamel(c.name);
        push(`| \`${camel}\` | \`${c.name}\` | \`${t.name}\` |`);
      }
    }
  }

  push('');

  return lines.join('\n');
}

function formatType(col: ParsedColumn): string {
  let type = col.type;

  if (col.maxLength) {
    if (type === 'varchar' || type === 'character varying') {
      type = `varchar(${col.maxLength})`;
    }
  }

  // Map enum types that are stored as their enum name
  if (col.enumValues && col.type !== 'text') {
    type = col.type;
  }

  return type;
}

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// ---------------------------------------------------------------------------
// 5. Main
// ---------------------------------------------------------------------------

async function main() {
  const { url, key } = loadEnv();
  const spec = await fetchOpenAPISpec(url, key);

  const { tables, enums } = parseSpec(spec);

  console.log(`Parsed ${tables.length} tables and ${enums.length} enum types.`);

  const markdown = generateMarkdown(tables, enums);

  const outPath = resolve(__dirname, '..', 'docs', 'database-schema.md');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, markdown, 'utf-8');

  console.log(`Written to ${outPath}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
