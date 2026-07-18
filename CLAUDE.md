# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

- `npm run dev` - Start Next.js dev server on localhost:3000
- `npm run build` - Build production bundle
- `npm run lint` - Run ESLint (flat config, v9)
No test framework is currently configured.

## Tech Stack

- **Next.js 16** with App Router, Server Components, and Server Actions
- **React 19** with React Hook Form
- **TypeScript 5** (strict mode)
- **Tailwind CSS 4** with shadcn/ui (new-york style)
- **Supabase** for PostgreSQL database and authentication

## Architecture

### Feature-Based Organization

All application source lives under `src/`. Code is organized by domain under
`src/features/` (auth, events, guests, schedules, dashboard, budget, collaborate,
confirmation, seating, templates, ai-chat, admin).

Each feature is a self-contained slice and should keep this internal shape:
- `queries/` - Server-side Supabase queries (server-only)
- `actions/` - Server Actions for mutations (`'use server'`)
- `schemas/` - Zod schemas for DB↔app transformations and form validation only
- `types.ts` - TypeScript-only types: view models, query result shapes, derived types (no Zod)
- `components/` - Feature-specific UI
- `utils/` - Data transformation and helpers
- `services/` (optional) - Server-only business logic shared by multiple `'use server'`
  entry points across features (e.g. a send/execution engine invoked by a Server Action, a
  cron route, and an admin action). Takes its dependencies (like a Supabase client) as
  parameters rather than constructing them, so it stays framework-agnostic and callable from
  any entry point. Not a Server Action itself and not a pure data-transform helper, so it
  doesn't belong in `actions/` or `utils/`. See `src/features/schedules/services/` for the
  reference pattern.
- `index.ts` - Public API barrel (see below)

**Public API barrels.** Every feature exposes a root `index.ts` that explicitly
re-exports its public surface (components, types, schemas, Server Actions, pure utils).
Import from the feature root (`@/features/guests`), not deep paths. Do NOT re-export
`queries/` - or any server-only module that pulls `next/headers` or
`@/lib/supabase/server` - through the barrel; import those directly from
`@/features/<name>/queries` so server-only code never leaks into client bundles.
`src/features/auth/index.ts` is the reference pattern.

### Key Directories

- `src/app/` - Next.js App Router. `(main)/[locale]/` is the localized public + authed app
  (`.../app/` = protected routes, `.../app/[eventId]/` = per-event routes); `(admin)/` is the
  subdomain-routed back office; `api/` holds route handlers.
- `src/proxy.ts` - Routing middleware (Next 16 `proxy` convention): subdomain rewrites + intl +
  Supabase session refresh.
- `src/components/ui/` - shadcn/ui primitives (generic, shared).
- `src/components/layout/` - App-shell components (sidebar, top bar, nav, mobile nav).
- `src/components/` (root) - Only truly-generic shared components. Domain components belong in
  their feature, never here.
- `src/lib/supabase/` - Supabase client config (`client.ts` browser, `server.ts` server).
- `src/hooks/` - Global custom hooks. `src/i18n/` - next-intl config.
- Repo root (NOT under `src/`): `messages/` (i18n catalogs), `public/`, `supabase/`, `docs/`,
  and config files.

### Database Schema

The Supabase MCP is connected and provides live schema context. Use `mcp__supabase__list_tables`, `mcp__supabase__execute_sql`, and related tools to inspect tables, columns, enums, and relationships directly rather than relying on any static schema file.

### Path Aliases

`@/*` maps to `src/*` (e.g. `@/features/...`, `@/components/...`, `@/lib/...`, `@/hooks/...`).

### Keeping to the Structure

When adding code, preserve the pattern above:
- New domain area → new `src/features/<name>/` with the standard subfolders and a root
  `index.ts` barrel. Consume features from their root barrel, not deep paths.
- Feature UI → `src/features/<name>/components/`, exported via the feature barrel. Put a
  component in `src/components/` only if it is genuinely generic and shared (`ui/` for
  primitives, `layout/` for app-shell). Never place domain-specific components at the
  `src/components/` root.
- Zod lives in `schemas/`; TypeScript-only types live in `types.ts`. Do not mix Zod into
  `types.ts`, and keep server-only code (queries, server Supabase client) out of any barrel a
  client component can import.
- One icon location: `src/components/icons/`.

## Patterns

### Data Flow

1. Server Components fetch data via queries in `/features/*/queries/`
2. Mutations use Server Actions in `/features/*/actions/`
3. Zod schemas transform database models to app models
4. Forms use React Hook Form with Zod validation via `useActionState`

### Server Action Toast Pattern

Wrap server actions with `toast.promise` from Sonner to provide loading/success/error feedback:

```typescript
import { toast } from 'sonner';

const actionWithToast = async (
  prevState: ActionState | null,
  params: { formData: FormData },
): Promise<ActionState | null> => {
  const promise = serverAction(params.formData).then((result) => {
    if (!result.success) {
      throw new Error(result.message || 'Operation failed.');
    }
    return result;
  });

  toast.promise(promise, {
    loading: 'Creating item...',
    success: (data) => {
      // Side effects (close modal, reset form, navigate)
      return data.message || 'Success!';
    },
    error: (err) =>
      err instanceof Error ? err.message : 'Something went wrong.',
  });

  try {
    return await promise;
  } catch {
    return null;
  }
};

// Use with useActionState
const [, formAction, isPending] = useActionState(actionWithToast, null);
```

### Supabase Client Usage

```typescript
// Server-side (Server Components, Server Actions)
import { createClient } from '@/lib/supabase/server';
const supabase = await createClient();

// Client-side (Client Components)
import { createClient } from '@/lib/supabase/client';
const supabase = createClient();
```

### Row Level Security (RLS)

Supabase RLS policies handle data ownership at the database level. **Do not add manual ownership checks in code** (e.g., verifying `user_id` matches the current user before CRUD operations). RLS automatically ensures users can only access their own data.

### Styling

- Use `cn()` from `@/lib/utils` for conditional class merging
- Tailwind CSS for all styling
- shadcn/ui components as base

### Copy & Typography

- **No em dashes**: Use regular hyphens (`-`) instead of em dashes (`—`). E.g. "Set up your timeline - get started" not "Set up your timeline — get started"
- **No trailing periods on UI text**: Remove periods from the end of single-line UI text like toast messages, labels, button text, and error messages. E.g. "Expense updated" not "Expense updated." (Multi-line descriptions/paragraphs may retain periods if they read as complete sentences)

## Environment Variables

Required in `.env.local` (see `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
