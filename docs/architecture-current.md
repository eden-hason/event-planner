# Architecture: Current State

> Snapshot of how `event-planner` is organized **today** (before the structure refactor).
> Companion doc: [`refactor-brief-fable.md`](./refactor-brief-fable.md) — the task brief for executing the refactor.

## 1. Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, RSC, Server Actions) |
| UI | React 19, Tailwind CSS 4, shadcn/ui (new-york) |
| Language | TypeScript 5 (strict) |
| Data / Auth | Supabase (Postgres + Auth + RLS) |
| Forms | React Hook Form + Zod (`useActionState`) |
| i18n | next-intl (`en`, `he`) with `[locale]` segment |
| AI | `ai` SDK + `@ai-sdk/anthropic` |
| Messaging | Twilio (SMS), WhatsApp webhooks, Resend (email) |

No test framework is configured. Path alias: `@/*` → repo root (no `src/`).

## 2. Top-Level Layout

```
event-planner/
├── app/            Next.js App Router (routes, layouts, route handlers)
├── features/       Domain modules (the core of the app) — 12 features
├── components/     Shared UI: shadcn primitives + app-level components (mixed)
├── hooks/          3 global hooks
├── lib/            Cross-cutting infra: supabase, email, storage, services
├── i18n/           next-intl routing/request/navigation config
├── messages/       en.json / he.json translation catalogs
├── supabase/       Migrations, config, edge functions, SQL
├── docs/           Endpoint docs (sparse)
├── public/         Static assets
└── middleware.ts   Subdomain routing (admin/partners) + intl + auth session
```

## 3. Routing (`app/`)

Two route groups plus non-localized handler roots:

```
app/
├── layout.tsx                      Root layout (html/body, providers)
├── globals.css · icon.svg
│
├── (main)/[locale]/                Localized public + authenticated app
│   ├── layout.tsx
│   ├── page.tsx                    Landing (homepage)
│   ├── login · privacy · error · auth/auth-code-error
│   ├── confirm/[token]             RSVP confirmation
│   ├── invitations/[token]         Collaborator invite response
│   └── app/                        AUTH-PROTECTED area
│       ├── layout.tsx · loading.tsx
│       ├── page.tsx                Event list
│       ├── new-event/
│       └── [eventId]/              Per-event workspace
│           ├── layout.tsx · loading.tsx
│           ├── dashboard · details · guests · schedules
│           ├── budget · collaborate · seating · templates
│
├── (admin)/admin/                  Back-office (NOT localized; subdomain-rewritten)
│   ├── layout.tsx · page.tsx
│   ├── events/ · events/[eventId]/ (+ calls/)
│   └── users/ · users/[userId]/
│
├── api/                            Route handlers
│   ├── ai-chat · cron/process-messages
│   ├── schedules/[id]/execute · webhooks/whatsapp
├── auth/callback · auth/confirm    OAuth / email confirm handlers
└── nav/[code]                      Short-link redirect handler
```

`middleware.ts` rewrites `admin.*` / `partners.*` subdomains to `/admin`/`/partners`
paths (auth only, no intl) and runs next-intl + Supabase session refresh for the main app.

## 4. Feature Modules (`features/`)

Each feature is a self-contained domain slice. The **intended** internal shape (per `CLAUDE.md`):

```
features/<name>/
├── queries/     Server-side Supabase reads
├── actions/     Server Actions (mutations)
├── schemas/     Zod schemas — DB↔app transforms + form validation ONLY
├── types.ts     TS-only types (view models, query shapes) — NO Zod
├── components/  Feature UI
├── utils/       Transforms & helpers
└── index.ts     Public API barrel
```

### Feature inventory

| Feature | Files | queries | actions | schemas | types.ts | utils | root `index.ts` | Notes |
| --- | ---: | :---: | :---: | :---: | :---: | :---: | :---: | --- |
| `admin` | 21 | ✓ | ✓ | – | ✓ | – | ✓ | Back-office; impersonation, calls |
| `ai-chat` | 4 | ✓ | – | – | – | ✓ | ✗ | Assistant panel + system prompt |
| `auth` | 7 | ✓ | ✓ | ✓ | – | – | ✓ | Barrel splits server/client exports |
| `budget` | 16 | ✓ | ✓ | ✓ | ✓ | – | ✗ | Expenses + gifts |
| `collaborate` | 20 | ✓ | ✓ | ✓ | – | ✓ | ✓ | Invites, roles, scopes |
| `confirmation` | 5 | ✓ | ✓ | ✓ | – | – | ✗ | Guest RSVP experience |
| `dashboard` | 19 | ✓ | – | – | ✓ | ✓ | ✗ | Read-only stat cards |
| `events` | 25 | ✓ | ✓ | ✓ | – | ✓ | ✓ | Event CRUD + onboarding wizard |
| `guests` | 47 | ✓ | ✓ | ✓ | – | ✓ | ✗ | Largest; CSV import, table, groups, `hooks/` |
| `schedules` | 40 | ✓ | ✓ | ✓ | – | ✓ | ✓ | Messaging; `config/`, `constants/`, inline `.md` |
| `seating` | 23 | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | Canvas floor plan (dnd-kit) |
| `templates` | 22 | – | – | – | ✓ | ✓ | ✗ | Landing designs; `data/`, `designs/`, `registry.tsx` |

### Component tree (representative features)

```
features/guests/components/
├── guests-page.tsx  guest-directory.tsx  guest-form.tsx  guest-stats.tsx
├── guest-search.tsx  guest-actions-section.tsx  offline-rsvp-dialog.tsx
├── index.ts
├── filters/         group-filter · rsvp-status-filter · side-filter · index
├── groups/          groups-directory · group-card · group-icon · guest-list-card
│   ├── assign-guests-drawer · create-group-dialog · index
│   └── import-guests-dialog/   upload → analyze → map → validate → summary steps
└── table/           guests-table · columns · row-actions · index

features/schedules/components/
├── schedules-page · schedules-layout · schedules-header · schedules-empty-state
├── schedule-details-card · schedule-status-card · schedule-setup-wizard
├── schedule-interactions-card · guest-interactions-table · message-content-card
├── target-audience-card · send-confirm-dialog · interactions-refresh-button · index
└── wizard/          wizard-invitation-step · wizard-timeline-step

features/templates/
├── components/      templates-page · template-library-grid · template-card
│                    template-preview · live-template-preview · ...
├── data/            template-library.ts
├── designs/         dark-romantic · ivory-editorial · kululu-confetti · linen
│                    (each: constants.ts + <name>-design.tsx, 590–839 LOC)
└── registry.tsx     type · utils.ts
```

## 5. Shared UI (`components/`)

```
components/
├── ui/                     58 shadcn/generic primitives (button, dialog, table, …)
│   └── icons/              3 one-off icon components
├── icons/                  2 more icon components   ← second icon location
├── feature-layout/         Shared page-shell: header + layout/collaboration context
│
└── (app-level components — all 'use client', domain-coupled):
    app-sidebar · app-top-bar · mobile-bottom-nav · layout-content-wrapper
    nav-main · nav-events · nav-secondary          ← navigation shell
    login-form · google-login-button              ← belongs to auth
    onboarding                                     ← belongs to events
    homepage-client (1105 LOC)                     ← belongs to landing route
    pie-chart                                      ← belongs to dashboard/charts
    card-container · language-switcher
```

## 6. Cross-Cutting (`lib/`, `hooks/`, `i18n/`)

```
lib/
├── supabase/      client · server · middleware · admin · service   (clear)
├── email/         send-invitation-email
├── services/      message-processor (406 LOC)
├── resend.ts · storage.ts · storage.server.ts · compose-refs.ts · utils.ts

hooks/             use-dynamic-page-size · use-logout · use-mobile
i18n/              routing · request · navigation
```

## 7. Observed Inconsistencies (refactor targets)

1. **`components/` is a grab-bag.** 14 app-level components sit beside global `ui/`
   primitives. Several are clearly feature-owned (`login-form`→auth, `onboarding`→events,
   `homepage-client`→landing, `pie-chart`→dashboard) or shell-owned (`nav-*`, `app-sidebar`,
   `app-top-bar`, `mobile-bottom-nav`, `layout-content-wrapper`).
2. **Two icon locations:** `components/icons/` and `components/ui/icons/`.
3. **Duplicated hook:** `hooks/use-dynamic-page-size.ts` (real, 124 LOC) vs
   `features/guests/hooks/use-dynamic-page-size.ts` (re-export shim).
4. **Inconsistent public API:** only 5 / 12 features expose a root `index.ts`; the rest
   are imported via deep paths (`@/features/x/components`, `@/features/x/queries`).
5. **`types.ts` vs `schemas/` applied unevenly** — some features have one, some both,
   some neither, despite `CLAUDE.md` defining a clear split.
6. **Docs scattered:** `docs/` holds one file while `features/schedules/` carries inline
   `TESTING.md` and `USAGE_EXAMPLES.md`.
7. **Ad-hoc feature subfolders** (`config/`, `constants/`, `data/`, `designs/`, `hooks/`)
   appear in some features with no shared convention.
8. **No `src/` root** — source and config share the repo root.
9. **Very large files** (`file-upload` 1437, `stepper` 1312, `homepage-client` 1105) that
   mix concerns and are hard for agents to navigate.

These are catalogued as concrete, ordered steps in the refactor brief.
