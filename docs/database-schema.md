# Database Schema Documentation

> **Last Updated:** 2026-02-06
>
> **How to regenerate:** Run the following command from the project root:
>
> ```bash
> npm run generate:db-docs
> ```
>
> For RLS policies, indexes, functions, and triggers, query `information_schema` and `pg_catalog` using the **service role key** via the Supabase SQL Editor or CLI.

---

## Table of Contents

1. [Overview](#overview)
2. [Entity Relationship Diagram](#entity-relationship-diagram)
3. [Enum Types](#enum-types)
4. [Tables](#tables)
   - [profiles](#profiles)
   - [events](#events)
   - [guests](#guests)
   - [groups](#groups)
   - [schedules](#schedules)
   - [message_templates](#message_templates)
   - [message_deliveries](#message_deliveries)
   - [guest_interactions](#guest_interactions)
5. [Foreign Key Relationships](#foreign-key-relationships)
6. [JSONB Column Structures](#jsonb-column-structures)
7. [Row Level Security (RLS) Policies](#row-level-security-rls-policies)
8. [Indexes](#indexes)
9. [Database Functions & Triggers](#database-functions--triggers)

---

## Overview

The database uses **PostgreSQL** (hosted on Supabase) and consists of **8 tables** in the `public` schema:

| Table | Description | Primary Use |
|---|---|---|
| `profiles` | User profile data linked to Supabase Auth | User management |
| `events` | Core event records (weddings, birthdays, etc.) | Event CRUD |
| `guests` | Guest list per event | Guest management |
| `groups` | Guest groupings (e.g., bride's side, work friends) | Guest organization |
| `schedules` | Stores scheduled messages for events with timing and targeting configuration | Messaging automation |
| `message_templates` | Stores message templates for different event types and message stages | Message content |
| `message_deliveries` | Tracks individual message delivery status per guest | Delivery analytics |
| `guest_interactions` | Records all guest interactions with messages for detailed analytics | Engagement tracking |

Authentication is handled by **Supabase Auth** (`auth.users`), which is separate from the `public` schema.

---

## Entity Relationship Diagram

```
auth.users
    |
    | 1:1 (id)
    v
profiles
    |
    | (user_id)
    |
    v
events ─────────────────────────────────┐
    |                                    |
    | 1:N (event_id)                     | 1:N (event_id)
    v                                    v
groups                               schedules ──────────────┐
    |                                    |                    |
    | 1:N (group_id)                     | N:1 (template_id)  |
    v                                    v                    |
guests                           message_templates            |
    |                                                         |
    |  ┌──────────────────────────────────────────────────────┘
    |  |
    |  | 1:N (schedule_id, guest_id)
    v  v
message_deliveries
guest_interactions
```

---

## Enum Types

The database defines the following custom PostgreSQL enum types:

### `public.cta_type`

| Value |
|---|
| `view_invitation` |
| `confirm_rsvp` |
| `view_directions` |
| `view_photos` |
| `none` |

### `public.delivery_method`

| Value |
|---|
| `whatsapp` |
| `landing_page` |
| `both` |

### `public.delivery_status`

| Value |
|---|
| `pending` |
| `sent` |
| `delivered` |
| `read` |
| `failed` |

### `public.event_type`

| Value |
|---|
| `wedding` |
| `birthday` |
| `corporate` |
| `other` |

### `public.interaction_type`

| Value |
|---|
| `view` |
| `click` |
| `rsvp_confirm` |
| `rsvp_decline` |
| `update_guests` |
| `share` |

### `public.message_type`

| Value |
|---|
| `initial_invitation` |
| `first_confirmation` |
| `second_confirmation` |
| `event_reminder` |
| `thank_you` |

### `public.PRICING_PLAN`

| Value |
|---|
| `basic` |
| `pro` |

### `public.RSVP_STATUS`

| Value |
|---|
| `pending` |
| `confirmed` |
| `declined` |

### `public.schedule_status`

| Value |
|---|
| `draft` |
| `scheduled` |
| `sent` |
| `cancelled` |

---

## Tables

### `profiles`

> Stores public profile information for each user.

The `id` column maps directly to `auth.users.id` (set on user creation, not auto-generated).


| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | `uuid` | **NO** | - | **PK** | References `auth.users.id` |
| `avatar_url` | `text` | YES | - |  |  |
| `email` | `text` | YES | - |  |  |
| `full_name` | `text` | YES | - |  |  |
| `initial_setup_complete` | `boolean` | YES | - |  |  |
| `phone_number` | `text` | YES | - |  |  |
| `pricing_plan` | `PRICING_PLAN` | YES | - |  | Enum: `basic`, `pro` |

**Note:** Currently not queried by the application code. User data is read from `auth.users` metadata via `supabase.auth.getUser()`.

---

### `events`

> Core table for all event types (weddings, birthdays, corporate events, etc.).

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | `uuid` | **NO** | `gen_random_uuid()` | **PK** |  |
| `user_id` | `uuid` | **NO** | - | **FK** -> `auth.users.id` | Owner of the event |
| `ceremony_time` | `text` | YES | - |  | Time string |
| `description` | `text` | YES | - |  |  |
| `event_date` | `timestamptz` | **NO** | - |  |  |
| `event_settings` | `jsonb` | YES | - |  | See [JSONB structures](#event_settings) |
| `event_type` | `text` | YES | - |  | Free-text (not enum) |
| `host_details` | `jsonb` | YES | - |  | See [JSONB structures](#host_details) |
| `invitations` | `jsonb` | YES | - |  | See [JSONB structures](#invitations) |
| `is_default` | `boolean` | YES | - |  | User's default event |
| `location` | `jsonb` | YES | - |  | See [JSONB structures](#location) |
| `reception_time` | `text` | YES | - |  | Time string |
| `status` | `text` | YES | `'draft'` |  | Values: `draft`, `published`, `archived` |
| `title` | `text` | **NO** | - |  |  |
| `created_at` | `timestamptz` | YES | `now()` |  |  |
| `updated_at` | `timestamptz` | YES | `now()` |  |  |

---

### `guests`

> Stores the guest list for each event with RSVP tracking.

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | `uuid` | **NO** | `gen_random_uuid()` | **PK** |  |
| `event_id` | `uuid` | YES | - | **FK** -> `events.id` |  |
| `group_id` | `uuid` | YES | - | **FK** -> `groups.id` |  |
| `amount` | `integer` | YES | `1` |  | Number of seats/attendees |
| `dietary_restrictions` | `text` | YES | - |  |  |
| `name` | `varchar(255)` | **NO** | - |  |  |
| `notes` | `text` | YES | - |  |  |
| `phone_number` | `varchar(20)` | YES | - |  |  |
| `rsvp_status` | `RSVP_STATUS` | YES | `'pending'` |  | Enum: `pending`, `confirmed`, `declined` |
| `created_at` | `timestamptz` | YES | `now()` |  |  |
| `updated_at` | `timestamptz` | YES | `now()` |  |  |

---

### `groups`

> Guest grouping for organization (e.g., bride's side, groom's side, work friends).

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | `uuid` | **NO** | `gen_random_uuid()` | **PK** |  |
| `event_id` | `uuid` | YES | - | **FK** -> `events.id` |  |
| `description` | `varchar(500)` | YES | - |  |  |
| `icon` | `varchar(50)` | YES | `'IconUsers'` |  | Icon identifier from `GROUP_ICONS` |
| `name` | `varchar(100)` | **NO** | - |  |  |
| `side` | `varchar(10)` | YES | - |  | `bride` or `groom` |
| `created_at` | `timestamptz` | **NO** | `now()` |  |  |
| `updated_at` | `timestamptz` | **NO** | `now()` |  |  |

---

### `schedules`

> Stores scheduled messages for events with timing and targeting configuration.

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | `uuid` | **NO** | `gen_random_uuid()` | **PK** |  |
| `event_id` | `uuid` | **NO** | - | **FK** -> `events.id` |  |
| `template_id` | `uuid` | YES | - | **FK** -> `message_templates.id` |  |
| `custom_content` | `jsonb` | YES | - |  | See [JSONB structures](#custom_content) |
| `delivery_method` | `delivery_method` | YES | `'both'` |  | Enum: `whatsapp`, `landing_page`, `both` |
| `message_type` | `message_type` | **NO** | - |  | Enum: `initial_invitation`, `first_confirmation`, `second_confirmation`, `event_reminder`, `thank_you` |
| `scheduled_date` | `timestamptz` | **NO** | - |  | When to send |
| `sent_at` | `timestamptz` | YES | - |  | Actual send time |
| `status` | `schedule_status` | YES | `'draft'` |  | Enum: `draft`, `scheduled`, `sent`, `cancelled` |
| `target_filter` | `jsonb` | YES | - |  | See [JSONB structures](#target_filter) |
| `created_at` | `timestamptz` | YES | `now()` |  |  |
| `updated_at` | `timestamptz` | YES | `now()` |  |  |

---

### `message_templates`

> Stores message templates for different event types and message stages.

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | `uuid` | **NO** | `gen_random_uuid()` | **PK** |  |
| `body_template` | `text` | **NO** | - |  | Main message body |
| `created_by` | `uuid` | YES | - |  | User who created (null for system) |
| `cta_text` | `varchar(100)` | YES | - |  | Call-to-action button text |
| `cta_type` | `cta_type` | YES | `'none'` |  | Enum: `view_invitation`, `confirm_rsvp`, `view_directions`, `view_photos`, `none` |
| `default_days_offset` | `integer` | **NO** | - |  | Days before/after event to send |
| `default_time` | `time` | **NO** | `'10:00:00'` |  | Default send time |
| `event_type` | `event_type` | **NO** | - |  | Enum: `wedding`, `birthday`, `corporate`, `other` |
| `is_default` | `boolean` | **NO** | `false` |  | Default template for its type |
| `is_system` | `boolean` | YES | `false` |  | System-provided template |
| `message_type` | `message_type` | **NO** | - |  | Enum: `initial_invitation`, `first_confirmation`, `second_confirmation`, `event_reminder`, `thank_you` |
| `name` | `varchar(255)` | **NO** | - |  | Template display name |
| `subject` | `varchar(500)` | YES | - |  | Email subject line |
| `whatsapp_template` | `text` | YES | - |  | WhatsApp-specific body |
| `created_at` | `timestamptz` | YES | `now()` |  |  |
| `updated_at` | `timestamptz` | YES | `now()` |  |  |

---

### `message_deliveries`

> Tracks individual message delivery status per guest.

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | `uuid` | **NO** | `gen_random_uuid()` | **PK** |  |
| `guest_id` | `uuid` | **NO** | - | **FK** -> `guests.id` |  |
| `schedule_id` | `uuid` | **NO** | - | **FK** -> `schedules.id` |  |
| `clicked_at` | `timestamptz` | YES | - |  |  |
| `delivered_at` | `timestamptz` | YES | - |  |  |
| `delivery_method` | `delivery_method` | **NO** | - |  | Enum: `whatsapp`, `landing_page`, `both` |
| `error_message` | `text` | YES | - |  | Error details on failure |
| `read_at` | `timestamptz` | YES | - |  |  |
| `responded_at` | `timestamptz` | YES | - |  |  |
| `response_data` | `jsonb` | YES | - |  | See [JSONB structures](#response_data) |
| `sent_at` | `timestamptz` | YES | - |  |  |
| `status` | `delivery_status` | YES | `'pending'` |  | Enum: `pending`, `sent`, `delivered`, `read`, `failed` |
| `whatsapp_message_id` | `varchar(255)` | YES | - |  | Twilio/WhatsApp message ID |
| `created_at` | `timestamptz` | YES | `now()` |  |  |
| `updated_at` | `timestamptz` | YES | `now()` |  |  |

**Note:** Not currently queried by the application code (schema defined for future use).

---

### `guest_interactions`

> Records all guest interactions with messages for detailed analytics.

| Column | Type | Nullable | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `id` | `uuid` | **NO** | `gen_random_uuid()` | **PK** |  |
| `guest_id` | `uuid` | **NO** | - | **FK** -> `guests.id` |  |
| `schedule_id` | `uuid` | **NO** | - | **FK** -> `schedules.id` |  |
| `interaction_type` | `interaction_type` | **NO** | - |  | Enum: `view`, `click`, `rsvp_confirm`, `rsvp_decline`, `update_guests`, `share` |
| `metadata` | `jsonb` | YES | - |  | See [JSONB structures](#interaction-metadata) |
| `created_at` | `timestamptz` | YES | `now()` |  |  |

**Note:** Not currently queried by the application code (schema defined for future use).

---

## Foreign Key Relationships

| Source Table | Source Column | Target Table | Target Column | On Delete |
|---|---|---|---|---|
| `profiles` | `id` | `auth.users` | `id` | (implied) |
| `events` | `user_id` | `auth.users` | `id` | (implied) |
| `guests` | `event_id` | `events` | `id` | - |
| `guests` | `group_id` | `groups` | `id` | - |
| `groups` | `event_id` | `events` | `id` | - |
| `schedules` | `event_id` | `events` | `id` | - |
| `schedules` | `template_id` | `message_templates` | `id` | - |
| `message_deliveries` | `guest_id` | `guests` | `id` | - |
| `message_deliveries` | `schedule_id` | `schedules` | `id` | - |
| `guest_interactions` | `guest_id` | `guests` | `id` | - |
| `guest_interactions` | `schedule_id` | `schedules` | `id` | - |

---

## JSONB Column Structures

These columns store structured JSON data. The expected shapes are defined by Zod schemas in the application code.

### `location`

_Table: `events`_

```jsonc
{
  "name": "Venue Name",           // string, required
  "coords": {                     // optional
    "lat": 32.0853,               // number
    "lng": 34.7818                // number
  }
}
```

### `event_settings`

_Table: `events`_

```jsonc
{
  "paybox_config": {              // optional
    "enabled": true,              // boolean
    "link": "https://..."         // string
  },
  "bit_config": {                 // optional
    "enabled": true,              // boolean
    "phoneNumber": "0501234567"   // string
  }
}
```

### `host_details`

_Table: `events`_

```jsonc
// Wedding-specific host details
{
  "bride": {                      // optional
    "name": "Name",               // string, optional
    "parents": "Parent Names"     // string, optional
  },
  "groom": {                      // optional
    "name": "Name",               // string, optional
    "parents": "Parent Names"     // string, optional
  }
}
```

### `invitations`

_Table: `events`_

```jsonc
{
  "front_image_url": "https://...",  // string, optional
  "back_image_url": "https://..."    // string, optional
}
```

### `target_filter`

_Table: `schedules`_

```jsonc
{
  "guestStatus": ["pending", "confirmed"],  // array of RSVP_STATUS values, optional
  "tags": ["family", "vip"],                // array of strings, optional
  "groupIds": ["uuid-1", "uuid-2"]          // array of group UUIDs, optional
}
```

### `custom_content`

_Table: `schedules`_

```jsonc
{
  "subject": "Custom subject line",    // string, optional
  "body": "Custom message body",       // string, optional
  "whatsappBody": "WhatsApp version",  // string, optional
  "ctaText": "Click here",             // string, optional
  "ctaUrl": "https://..."              // URL string, optional
}
```

### `response_data`

_Table: `message_deliveries`_

```jsonc
{
  "guestCount": 2,                        // integer, optional
  "dietaryRestrictions": "Vegetarian",    // string, optional
  "notes": "Looking forward to it"        // string, optional
}
```

### Interaction Metadata

_Table: `guest_interactions`_

```jsonc
{
  "guestCount": 2,                     // integer, optional
  "dietaryRestrictions": "Vegan",      // string, optional
  "linkClicked": "https://...",        // string, optional
  "userAgent": "Mozilla/5.0..."        // string, optional
}
```

---

## Row Level Security (RLS) Policies

RLS is enabled on all tables. Policies enforce data ownership at the database level, meaning the application code does **not** perform manual `user_id` checks.

> **To enumerate the exact RLS policies**, run the following SQL in the Supabase SQL Editor:
>
> ```sql
> SELECT
>   schemaname,
>   tablename,
>   policyname,
>   permissive,
>   roles,
>   cmd,
>   qual,
>   with_check
> FROM pg_policies
> WHERE schemaname = 'public'
> ORDER BY tablename, policyname;
> ```

### Expected RLS Patterns

Based on the application architecture, the following RLS patterns are expected:

**`profiles`**
- Users can read/update their own profile (`id = auth.uid()`)

**`events`**
- Users can CRUD their own events (`user_id = auth.uid()`)

**`guests`, `groups`**
- Access is scoped through `event_id` to events owned by the current user
- Likely uses a subquery: `event_id IN (SELECT id FROM events WHERE user_id = auth.uid())`

**`schedules`**
- Access scoped through `event_id` to events owned by the current user

**`message_templates`**
- System templates (`is_system = true`) are readable by all authenticated users
- User-created templates scoped by `created_by = auth.uid()`

**`message_deliveries`, `guest_interactions`**
- Access scoped through the schedule -> event ownership chain

---

## Indexes

> **To enumerate all indexes**, run the following SQL in the Supabase SQL Editor:
>
> ```sql
> SELECT
>   schemaname,
>   tablename,
>   indexname,
>   indexdef
> FROM pg_indexes
> WHERE schemaname = 'public'
> ORDER BY tablename, indexname;
> ```

### Expected Indexes

At minimum, PostgreSQL automatically creates indexes for:

- **Primary keys**: `{table}_pkey` on `id` for every table
- **Foreign keys**: Indexes on all FK columns listed in [Foreign Key Relationships](#foreign-key-relationships) are recommended for join performance

### Commonly Useful Indexes

| Table | Column(s) | Rationale |
|---|---|---|
| `events` | `user_id` | Filter events by owner |
| `guests` | `event_id` | List guests for an event |
| `guests` | `group_id` | List guests in a group |
| `groups` | `event_id` | List groups for an event |
| `schedules` | `event_id` | List schedules for an event |
| `schedules` | `template_id` | Join with templates |
| `message_deliveries` | `schedule_id` | List deliveries for a schedule |
| `message_deliveries` | `guest_id` | Delivery history for a guest |
| `guest_interactions` | `guest_id` | Interaction history for a guest |
| `guest_interactions` | `schedule_id` | Interactions for a schedule |

---

## Database Functions & Triggers

> **To enumerate all functions and triggers**, run the following SQL:
>
> ```sql
> -- Functions
> SELECT routine_name, routine_type, data_type
> FROM information_schema.routines
> WHERE routine_schema = 'public'
> ORDER BY routine_name;
>
> -- Triggers
> SELECT
>   trigger_name,
>   event_manipulation,
>   event_object_table,
>   action_statement
> FROM information_schema.triggers
> WHERE trigger_schema = 'public'
> ORDER BY event_object_table, trigger_name;
> ```

### Known/Expected Functions

Based on the default values using `now()` and `gen_random_uuid()`, these are PostgreSQL built-in functions. No custom RPC functions are exposed via the REST API.

### Expected Triggers

| Table | Trigger | Event | Purpose |
|---|---|---|---|
| `profiles` | `on_auth_user_created` | AFTER INSERT on `auth.users` | Auto-create profile row for new users |
| All tables with `updated_at` | `set_updated_at` | BEFORE UPDATE | Auto-update `updated_at` timestamp |

> **Note:** These are common Supabase patterns but have not been verified against the actual database. Use the SQL queries above to confirm.

---

## App-to-Database Field Mapping

The application uses **camelCase** in TypeScript and **snake_case** in the database. Zod schemas handle the transformation. Key mappings:

| App Field (camelCase) | DB Column (snake_case) | Table |
|---|---|---|
| `avatarUrl` | `avatar_url` | `profiles` |
| `fullName` | `full_name` | `profiles` |
| `initialSetupComplete` | `initial_setup_complete` | `profiles` |
| `phoneNumber` | `phone_number` | `profiles` |
| `pricingPlan` | `pricing_plan` | `profiles` |
| `userId` | `user_id` | `events` |
| `ceremonyTime` | `ceremony_time` | `events` |
| `eventDate` | `event_date` | `events` |
| `eventSettings` | `event_settings` | `events` |
| `eventType` | `event_type` | `events` |
| `hostDetails` | `host_details` | `events` |
| `isDefault` | `is_default` | `events` |
| `receptionTime` | `reception_time` | `events` |
| `createdAt` | `created_at` | `events` |
| `updatedAt` | `updated_at` | `events` |
| `eventId` | `event_id` | `guests` |
| `groupId` | `group_id` | `guests` |
| `dietaryRestrictions` | `dietary_restrictions` | `guests` |
| `phoneNumber` | `phone_number` | `guests` |
| `rsvpStatus` | `rsvp_status` | `guests` |
| `createdAt` | `created_at` | `guests` |
| `updatedAt` | `updated_at` | `guests` |
| `eventId` | `event_id` | `groups` |
| `createdAt` | `created_at` | `groups` |
| `updatedAt` | `updated_at` | `groups` |
| `eventId` | `event_id` | `schedules` |
| `templateId` | `template_id` | `schedules` |
| `customContent` | `custom_content` | `schedules` |
| `deliveryMethod` | `delivery_method` | `schedules` |
| `messageType` | `message_type` | `schedules` |
| `scheduledDate` | `scheduled_date` | `schedules` |
| `sentAt` | `sent_at` | `schedules` |
| `targetFilter` | `target_filter` | `schedules` |
| `createdAt` | `created_at` | `schedules` |
| `updatedAt` | `updated_at` | `schedules` |
| `bodyTemplate` | `body_template` | `message_templates` |
| `createdBy` | `created_by` | `message_templates` |
| `ctaText` | `cta_text` | `message_templates` |
| `ctaType` | `cta_type` | `message_templates` |
| `defaultDaysOffset` | `default_days_offset` | `message_templates` |
| `defaultTime` | `default_time` | `message_templates` |
| `eventType` | `event_type` | `message_templates` |
| `isDefault` | `is_default` | `message_templates` |
| `isSystem` | `is_system` | `message_templates` |
| `messageType` | `message_type` | `message_templates` |
| `whatsappTemplate` | `whatsapp_template` | `message_templates` |
| `createdAt` | `created_at` | `message_templates` |
| `updatedAt` | `updated_at` | `message_templates` |
| `guestId` | `guest_id` | `message_deliveries` |
| `scheduleId` | `schedule_id` | `message_deliveries` |
| `clickedAt` | `clicked_at` | `message_deliveries` |
| `deliveredAt` | `delivered_at` | `message_deliveries` |
| `deliveryMethod` | `delivery_method` | `message_deliveries` |
| `errorMessage` | `error_message` | `message_deliveries` |
| `readAt` | `read_at` | `message_deliveries` |
| `respondedAt` | `responded_at` | `message_deliveries` |
| `responseData` | `response_data` | `message_deliveries` |
| `sentAt` | `sent_at` | `message_deliveries` |
| `whatsappMessageId` | `whatsapp_message_id` | `message_deliveries` |
| `createdAt` | `created_at` | `message_deliveries` |
| `updatedAt` | `updated_at` | `message_deliveries` |
| `guestId` | `guest_id` | `guest_interactions` |
| `scheduleId` | `schedule_id` | `guest_interactions` |
| `interactionType` | `interaction_type` | `guest_interactions` |
| `createdAt` | `created_at` | `guest_interactions` |
