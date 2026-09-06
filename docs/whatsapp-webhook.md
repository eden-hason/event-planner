# `/api/webhooks/whatsapp` - Meta Cloud API notifications

> **Methods:** `GET` (verification handshake), `POST` (notifications)
> **Runtime:** `nodejs`
> **Source:** `src/app/api/webhooks/whatsapp/route.ts`
> **Env:** `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`

This is the return path for everything `sendWhatsAppTemplateMessage()` puts on
the wire. The send call only tells us Meta accepted the message and hands back a
`wamid`, which is stored on `message_deliveries.external_message_id`. Whether the
message actually reached the guest, was opened, or bounced is known only here.

## What the handler does

```
POST /api/webhooks/whatsapp
  ├─ 1. Verify X-Hub-Signature-256 (HMAC-SHA256 of the raw body, app secret)
  ├─ 2. Parse JSON (a signed but unparseable body answers 400, not 500)
  ├─ 3. Collect statuses[] across every entry/change in the payload
  ├─ 4. Collapse to the most advanced status per wamid
  ├─ 5. One indexed lookup for all of them (external_message_id IN (...))
  └─ For each matched delivery:
       └─ Write only if the new status outranks the stored one
```

Anything that is not a delivery status (inbound messages, marketing preference
changes, template status changes) is logged and otherwise ignored. There is no
table for it yet.

## Rules the handler holds to

**Meta redelivers, so the handler is idempotent.** Statuses are ranked
`pending < sent < delivered < read < failed` and a write only happens when the
incoming status outranks the stored one. A replayed `sent` after `delivered`
changes nothing. The write is guarded on the set of statuses it outranks
(`.in('status', ...)`), so two notifications racing on the same row cannot
reorder it without a transaction.

**`failed` is terminal.** Meta does not deliver a message it has already
reported as failed, so a lower-ranked status arriving afterwards is a late
duplicate, not a recovery. An organiser reading a failure list should not see
rows drop out of it.

**Timestamps come from Meta, not from us.** A notification can be minutes late
or a retry of an event from hours ago, so `delivered_at` and `read_at` are set
from `statuses[].timestamp`, and an existing value is never rewritten. The
`set_delivery_sent_at()` trigger is a backstop that only fills a column still
null (see `20260906000000_whatsapp_webhook_delivery_status.sql`).

**Failures keep their numeric code.** `error_code` gets `errors[0].code` and
`error_message` prefers `error_data.details` (the specific reason) over `title`
(the generic bucket). The code is the part `categoriseWhatsAppError()` in
`send-helpers.ts` branches on, and the only part of a Meta error stable enough
to build logic around.

**Processing errors never reach Meta.** Meta disables a webhook that keeps
failing. A delivery row we could not update is worth much less than the
subscription carrying every future one, so processing errors are logged and the
response is still 200.

## Reading the logs

Every line is prefixed `[whatsapp-webhook]`, so `[whatsapp-webhook]` in the
Vercel function logs is the whole picture. The happy path is quiet: one summary
line per request, no per-row output.

| Line | Means |
|---|---|
| `Handshake verified, echoing challenge` | Meta's GET succeeded. |
| `Handshake rejected: verify token mismatch (Meta sent N chars, this environment holds M)` | The console and the environment disagree. Lengths only, never the token. A wildly different N and M means a stale value; N one or two greater than M usually means whitespace came along with a paste. |
| `Handshake rejected: WHATSAPP_WEBHOOK_VERIFY_TOKEN is not set` | The var is missing in the environment the callback URL points at. On Vercel a new env var only reaches deployments built after it was added, so this persists until a redeploy. |
| `Rejected: signature mismatch over N bytes` | `WHATSAPP_APP_SECRET` almost certainly belongs to a different Meta app than the one holding the subscription. |
| `Rejected: no X-Hub-Signature-256 header` | Something that is not Meta is calling this URL. |
| `N status(es) -> M message(s), K matched, A applied, S already current, E write error(s)` | The one line that says the endpoint is working. `A` climbing over a send window is the thing to watch. |
| `N of M message id(s) matched no delivery row` | Sending and tracking have come apart: the delivery upsert failed, rows were deleted, or another environment shares this phone number. |
| `Delivery <id> to ***NNNN FAILED - <code>: <detail>` | A guest did not get their message. Always logged, never sampled. |
| `Template <name>: REJECTED (reason)` | A template Kululu sends is no longer usable. Every schedule bound to it will fail. |

Set `WHATSAPP_WEBHOOK_DEBUG=true` for raw payload dumps and per-delivery status
transitions. Off by default: one 500-guest send produces up to 1500
notifications, and the bodies carry guest phone numbers. Phone numbers are
masked to their last four digits in every non-debug line.

## Webhook fields to subscribe to

Subscribed in **App Dashboard → WhatsApp → Configuration → Webhook fields**.
The endpoint tolerates fields it does not handle, so over-subscribing is safe.

### Required

| Field | Why |
|---|---|
| `messages` | Carries `statuses[]`: sent, delivered, read, failed. This one field is the entire delivery-tracking feature. Without it `message_deliveries` never moves past `sent` and no failure is ever recorded. It also carries inbound guest replies. |

### Recommended - operational health

None of these are handled in code yet; they are logged. They matter because a
send blast is a one-shot event with a hard deadline, and each of these can make
one fail silently.

| Field | Why |
|---|---|
| `message_template_status_update` | A template going `REJECTED`, `PAUSED` or `DISABLED` breaks every schedule bound to it. Schedules name templates months in advance, so the failure surfaces at send time unless this warns first. |
| `message_template_quality_update` | The early warning for the above. Quality drops precede a pause. |
| `phone_number_quality_update` | Quality rating (GREEN/YELLOW/RED) and messaging-limit changes. A RED rating throttles sends the night before an event. |
| `account_update` | WABA-level bans, restrictions and policy violations. When this fires, nothing sends at all. |
| `business_capability_update` | Messaging tier changes (1K/10K/100K per 24h). Determines whether a large blast goes through. |
| `user_preferences` | Marketing opt-out and opt-in (`stop` / `resume`). Needed for a suppression list if any template sits in the MARKETING category. Error `131050` on a failed status is the same event seen from the other side. |

### Not needed

`account_review_update`, `account_settings_update`, `phone_number_name_update`
(one-off onboarding or admin events), `flows` (no WhatsApp Flows),
`calls` and the call fields (a `phone_call` schedule is a person working a list,
not WhatsApp calling - see ADR 0004), `history`, `smb_message_echoes` and
`smb_app_state_sync` (Coexistence), `partner_solutions`, `tracking_events`,
`payment_configuration_update`.

`account_alerts` and `template_category_update` are optional. The second one is
worth having if template pricing category matters, since Meta reclassifies
templates between utility and marketing on its own.

## Configuration notes

- The callback URL must be the production domain. An ngrok tunnel is for local
  development only and dies with the tunnel.
- `WHATSAPP_APP_SECRET` must belong to the same Meta app that holds the webhook
  subscription. A mismatch makes every notification fail signature verification
  and answer 401, which looks exactly like an attack in the logs.
- Subscribing fields in the App Dashboard is only half the wiring. The WABA
  itself must be subscribed to the app (`POST /{waba-id}/subscribed_apps`).
  Embedded Signup does this; a manually configured account may not have it.
- Field versions in the dashboard are per field. The send path is pinned to
  `v22.0` (`actions/whatsapp.ts`); webhook payload changes are additive, so a
  newer field version is safe, but keep the two in mind together when upgrading.
