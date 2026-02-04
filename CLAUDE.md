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

Code is organized by domain under `/features/`:
- `auth/` - Authentication (email/password + Google OAuth)
- `events/` - Event CRUD operations
- `guests/` - Guest management with CSV import
- `schedules/` - Event schedule management
- `dashboard/` - Dashboard views

Each feature contains:
- `queries/` - Server-side Supabase queries
- `actions/` - Server Actions for mutations
- `schemas/` - Zod validation schemas
- `components/` - Feature-specific UI
- `utils/` - Data transformation and helpers

### Key Directories

- `/app/` - Next.js App Router pages
- `/app/app/` - Protected routes (requires auth)
- `/app/app/[eventId]/` - Dynamic event routes (dashboard, details, guests, schedules)
- `/components/ui/` - shadcn/ui components
- `/lib/supabase/` - Supabase client configuration (client.ts for browser, server.ts for server)
- `/hooks/` - Custom React hooks

### Path Aliases

`@/*` maps to the project root.

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

## Environment Variables

Required in `.env.local` (see `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
