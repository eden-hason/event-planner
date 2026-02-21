# `/api/cron/process-messages` — Endpoint Flow

> **Method:** `GET`
> **Runtime limit:** 10 seconds (`maxDuration = 10`)
> **Trigger:** External cron service (e.g., Vercel Cron)
> **Source:** `app/api/cron/process-messages/route.ts`

---

## High-Level Overview

This endpoint is a cron-triggered job that finds all WhatsApp message schedules that are due for sending, then processes each one by resolving template placeholders per-guest, calling the Meta WhatsApp Cloud API, and recording delivery results. It is designed for concurrent safety (optimistic locking) and fault isolation (one failing schedule does not block others).

```
Cron trigger (GET)
  │
  ├─ 1. Authenticate via Bearer token
  ├─ 2. Create service-role Supabase client (bypasses RLS)
  ├─ 3. Query all due schedules (status = 'scheduled', date ≤ now)
  │
  └─ For each schedule:
       ├─ Parse & validate schedule + event data
       ├─ Claim via optimistic lock (status → 'sent')
       ├─ Fetch WhatsApp template
       ├─ Fetch & filter guests (by RSVP status, group, phone validity)
       ├─ Batch-fetch guest groups
       ├─ Send messages concurrently (Promise.allSettled)
       ├─ Upsert delivery records to message_deliveries
       └─ Revert/cancel if all sends failed
```

---

## Detailed Step-by-Step Flow

### Step 0 — Authentication

```
Request → GET /api/cron/process-messages
Header:  Authorization: Bearer <CRON_SECRET>
```

The endpoint compares the `Authorization` header against `process.env.CRON_SECRET`. If the token doesn't match, it returns **401 Unauthorized** immediately. This prevents unauthorized invocation of the message-sending pipeline.

### Step 1 — Create Service-Role Supabase Client

```
lib/supabase/service.ts → createServiceClient()
```

A Supabase client is created with the **service role key** (`SUPABASE_SERVICE_ROLE_KEY`), which **bypasses Row Level Security (RLS)**. This is necessary because the cron job runs without an authenticated user session — it needs unrestricted access to read schedules, guests, templates, and write delivery records across all users' data.

### Step 2 — Query Due Schedules

```
lib/services/message-processor.ts → processScheduledMessages()
```

Queries the `schedules` table with a join on `events`:

| Filter             | Value                          |
| ------------------ | ------------------------------ |
| `status`           | `= 'scheduled'`               |
| `scheduled_date`   | `≤ current timestamp`         |
| Order              | `scheduled_date ASC`           |
| Limit              | `10` (batch cap per invocation)|

**Joined event fields:** `id`, `user_id`, `title`, `event_date`, `venue_name`, `location`, `host_details`, `invitations`

If no due schedules exist, the endpoint returns early with zero counts.

---

### Step 3 — Process Each Schedule (loop)

Each schedule is processed independently inside a `try/catch`. A failure in one schedule is logged and recorded in the `errors` array but does **not** prevent other schedules from processing.

#### 3a. Parse & Transform Data

The raw database row is parsed through Zod transformation schemas:

- **Schedule:** `ScheduleDbToAppSchema` — converts `snake_case` DB columns to `camelCase` app model, parses `target_filter` JSONB into a typed `TargetFilter` object (`guestStatus`, `tags`, `groupIds`).
- **Event:** Manually mapped from the joined `events` row to an app-level object with `title`, `eventDate`, `venueName`, `location`, `hostDetails`, and `invitations`.

#### 3b. Optimistic Lock (Claim Schedule)

```sql
UPDATE schedules
SET status = 'sent', sent_at = <now>
WHERE id = <schedule_id> AND status = 'scheduled'
RETURNING id
```

This is the **concurrency guard**. If two cron invocations overlap, only the first `UPDATE` succeeds (the row's status changes from `'scheduled'` to `'sent'`). The second invocation finds no matching row (`status` is no longer `'scheduled'`) and skips processing. This prevents duplicate message sends.

If the claim fails → the schedule is skipped silently (already being processed).

#### 3c. Validate Template Assignment

Checks that `schedule.templateId` is set. If not, the schedule is reverted (see [Revert/Cancel Logic](#revertcancel-logic)) and an error is thrown.

#### 3d. Fetch WhatsApp Template

```sql
SELECT * FROM whatsapp_templates WHERE id = <template_id>
```

The raw template is parsed through `WhatsAppTemplateDbToAppSchema`, producing an app-level object with:
- `templateName` — the Meta-registered template name
- `languageCode` — e.g., `'en_US'`, `'he'`
- `bodyText` — template body with `{{1}}`, `{{2}}` placeholders
- `parameters` — configuration mapping placeholder names to data sources and transformers
- `headerType` / `headerParameters` — optional media header config
- `buttons` — optional CTA button config

If not found → revert + error.

#### 3e. Fetch Event Guests

```sql
SELECT * FROM guests WHERE event_id = <event_id>
```

All guests for the event are fetched and parsed through `DbToAppTransformerSchema` (guest schema).

If no guests exist → revert + error.

#### 3f. Apply Target Filters

Guests are filtered using `filterGuestsByTarget()` based on the schedule's `targetFilter`:

| Filter         | Behavior                                              |
| -------------- | ----------------------------------------------------- |
| `guestStatus`  | Keep only guests whose `rsvpStatus` is in the list    |
| `groupIds`     | Keep only guests whose `groupId` is in the list       |
| (no filter)    | All guests pass through                               |

If no guests remain after filtering → revert + error.

#### 3g. Validate Phone Numbers

Each targeted guest's phone number is validated with `validatePhoneNumber()`:
- Must be non-null/non-empty
- Stripped of formatting (`spaces`, `-`, `(`, `)`, `.`)
- Must have at least 7 digits
- Must contain only digits and optional leading `+`

Guests without valid phones are excluded.

If zero guests have valid phones → revert + error.

#### 3h. Validate Template Parameters

Checks that `template.parameters` (the placeholder configuration object) exists. If missing → revert + error.

#### 3i. Batch-Fetch Guest Groups

Collects all unique `groupId` values from eligible guests and batch-fetches them:

```sql
SELECT * FROM groups WHERE id IN (<group_ids>)
```

Groups are parsed through `GroupDbToAppTransformerSchema` and stored in a `Map<string, GroupApp>` for O(1) lookup during parameter resolution.

---

### Step 4 — Send Messages Concurrently

All eligible guests are processed in parallel via `Promise.allSettled()`. For **each guest**:

#### 4a. Format Phone Number

`formatPhoneE164()` converts the phone to E.164 international format:

| Input Format        | Output             |
| ------------------- | ------------------ |
| `+972548129777`     | `+972548129777`    |
| `972548129777`      | `+972548129777`    |
| `0548129777`        | `+972548129777`    |
| `548129777`         | `+972548129777`    |

Default country code is Israel (`+972`).

#### 4b. Generate Confirmation Token

A cryptographically random 32-byte hex token is generated per guest using `crypto.randomBytes(32)`. This token is stored in the delivery record and can be used for RSVP confirmation links.

#### 4c. Build Resolution Context

A `ParameterResolutionContext` object is assembled:

```typescript
{
  guest,                    // Full guest object (name, phone, rsvpStatus, etc.)
  event,                    // Event details (title, eventDate, venueName, etc.)
  group,                    // Guest's group (if any), or null
  schedule,                 // Schedule details
  confirmationToken,        // Unique token for this guest
}
```

#### 4d. Resolve Template Parameters

Three types of parameters are resolved from the template configuration:

**Body Parameters** — `buildDynamicTemplateParameters()`
- Iterates over `template.parameters.placeholders` (a `Record<string, PlaceholderConfig>`)
- Each placeholder config specifies:
  - `source` — dot-notation path into the context (e.g., `guest.name`, `event.title`)
  - `transformer` — formatting function (`none`, `formatDate`, `rsvpLabel`, `currency`, `phoneNumber`)
  - `transformerOptions` — transformer-specific options (e.g., `{ locale: 'he', format: 'full' }`)
  - `fallback` — default value if source is null/undefined
- Each resolved value becomes a `{ type: 'text', text: '...' }` entry positionally matching `{{1}}`, `{{2}}`, etc.

**Header Parameters** — `buildDynamicHeaderParameters()`
- Resolves media URLs (image/video/document) from context
- Supports `source` path resolution with URL fallback
- Returns formatted media parameter for Meta API (e.g., `{ type: 'image', image: { link: '...' } }`)

**Button Parameters** — `buildDynamicButtonParameters()`
- Each button config produces a separate component entry per Meta API spec
- Resolves placeholder values within button text using the same `resolvePlaceholder()` logic

#### 4e. Call Meta WhatsApp Cloud API

```
features/schedules/actions/whatsapp.ts → sendWhatsAppTemplateMessage()
```

```
POST https://graph.facebook.com/v22.0/{WHATSAPP_PHONE_NUMBER_ID}/messages
Authorization: Bearer {WHATSAPP_ACCESS_TOKEN}
Content-Type: application/json

{
  "messaging_product": "whatsapp",
  "to": "+972...",
  "type": "template",
  "template": {
    "name": "<template_name>",
    "language": { "code": "<language_code>" },
    "components": [
      { "type": "header", "parameters": [...] },
      { "type": "body", "parameters": [...] },
      { "type": "button", "sub_type": "...", "index": 0, "parameters": [...] }
    ]
  }
}
```

Returns `{ success, message, messageId }`.

---

### Step 5 — Record Delivery Results

#### 5a. Build Delivery Records

For each `Promise.allSettled` result:

| Outcome       | `status`  | Fields Set                                           |
| ------------- | --------- | ---------------------------------------------------- |
| **Fulfilled + success** | `'sent'`  | `sent_at`, `whatsapp_message_id`, `confirmation_token` |
| **Fulfilled + failed**  | `'failed'`| `error_message`, `confirmation_token`                |
| **Rejected (exception)**| *(not recorded)* | Logged to console, increments `failedCount` |

#### 5b. Upsert to `message_deliveries`

```sql
INSERT INTO message_deliveries (schedule_id, guest_id, status, sent_at, whatsapp_message_id, error_message, confirmation_token)
VALUES (...)
ON CONFLICT (schedule_id, guest_id) DO UPDATE ...
```

The `onConflict: 'schedule_id,guest_id'` ensures idempotency — if a delivery record already exists for this schedule+guest pair (e.g., from a previous partial run), it gets updated rather than duplicated.

---

### Step 6 — Final Status Resolution

| Condition          | Action                                                  |
| ------------------ | ------------------------------------------------------- |
| `sentCount > 0`    | Status stays `'sent'` (set during optimistic lock)      |
| `sentCount === 0`  | Calls `revertOrCancel()` (see below)                    |

---

## Revert/Cancel Logic

`revertOrCancel(supabase, scheduleId, scheduledDate)`

When a schedule fails entirely (no messages sent successfully), the system decides whether to **retry** or **give up** based on how old the schedule is:

| Condition                                      | New Status    | Effect                          |
| ---------------------------------------------- | ------------- | ------------------------------- |
| `scheduledDate` is less than 24 hours ago      | `'scheduled'` | Will be retried on next cron run |
| `scheduledDate` is 24+ hours ago               | `'cancelled'` | Permanently abandoned           |

In both cases, `sent_at` is cleared back to `null`.

---

## Response Format

```json
{
  "success": true,
  "schedulesProcessed": 3,
  "totalSent": 45,
  "totalFailed": 2,
  "errors": [
    { "scheduleId": "uuid", "error": "No guests with valid phone numbers" }
  ]
}
```

---

## Database Tables Involved

| Table                  | Operation       | Purpose                                  |
| ---------------------- | --------------- | ---------------------------------------- |
| `schedules`            | SELECT, UPDATE  | Find due schedules, claim via lock, revert/cancel |
| `events`               | SELECT (join)   | Event details for template parameters    |
| `whatsapp_templates`   | SELECT          | Template name, language, parameter config |
| `guests`               | SELECT          | Recipient list with phone numbers        |
| `groups`               | SELECT          | Group data for template personalization  |
| `message_deliveries`   | UPSERT          | Per-guest delivery tracking records      |

---

## Environment Variables Required

| Variable                         | Used By                   | Purpose                        |
| -------------------------------- | ------------------------- | ------------------------------ |
| `CRON_SECRET`                    | Route handler             | Authenticates cron requests    |
| `NEXT_PUBLIC_SUPABASE_URL`       | Service client            | Supabase project URL           |
| `SUPABASE_SERVICE_ROLE_KEY`      | Service client            | Bypasses RLS for cron access   |
| `WHATSAPP_PHONE_NUMBER_ID`       | WhatsApp action           | Meta Business phone number ID  |
| `WHATSAPP_ACCESS_TOKEN`          | WhatsApp action           | Meta Graph API bearer token    |

---

## Error Handling & Resilience

| Concern                  | Strategy                                                         |
| ------------------------ | ---------------------------------------------------------------- |
| Duplicate invocations    | Optimistic lock — only first claimer processes the schedule      |
| Partial failures         | `Promise.allSettled` — one guest failing doesn't block others    |
| Schedule-level failures  | Independent `try/catch` per schedule in the loop                 |
| Transient failures       | `revertOrCancel` retries schedules less than 24h old             |
| Stale schedules          | `revertOrCancel` cancels schedules older than 24h                |
| Duplicate deliveries     | Upsert with `ON CONFLICT (schedule_id, guest_id)`               |
| Missing config           | Validated at each step; reverts schedule and throws on failure   |
| API rate limits          | Batch cap of 10 schedules per invocation                         |

---

## Key Source Files

| File                                               | Role                                      |
| -------------------------------------------------- | ----------------------------------------- |
| `app/api/cron/process-messages/route.ts`           | HTTP entry point, auth, response          |
| `lib/services/message-processor.ts`                | Orchestration: query, lock, send, record  |
| `lib/supabase/service.ts`                          | Service-role Supabase client factory      |
| `features/schedules/actions/whatsapp.ts`           | Meta WhatsApp Cloud API caller            |
| `features/schedules/utils/parameter-resolvers.ts`  | Template placeholder resolution engine    |
| `features/schedules/utils/index.ts`                | Guest filtering, phone validation/formatting |
| `features/schedules/schemas/index.ts`              | Schedule/delivery Zod schemas & transformers |
| `features/schedules/schemas/whatsapp-templates.ts` | WhatsApp template Zod schemas             |
| `features/guests/schemas/index.ts`                 | Guest/group Zod schemas & transformers    |
