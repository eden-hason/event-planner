# Refactor Brief — Structure Cleanup (for Claude Fable)

**Goal:** Reshape `event-planner` into an idiomatic, predictable Next.js structure so code
agents can navigate it with zero ambiguity. This is a **structural / mechanical refactor
only** — no behavior, styling, or logic changes. Full current-state map:
[`architecture-current.md`](./architecture-current.md).

## Ground rules

- **No behavior change.** Only move files, fix imports, add barrels, delete dead files.
- **One phase per PR/branch.** Never push to `main` — branch per phase.
- **After every phase:** `npm run lint` and `npm run build` must both pass. If either
  fails, fix imports before moving on. (No test suite exists.)
- **Preserve `'use client'` / server-only boundaries.** Do not merge server-only code
  (queries/actions) into barrels that client components import. Follow the split pattern
  already used in `features/auth/index.ts`.
- **Do NOT touch:** RLS patterns, Supabase queries, Server Action logic, `middleware.ts`
  routing, i18n message keys, DB migrations.
- Keep all imports on the `@/*` alias. Update every import site when a file moves
  (grep for the old path; leave no dangling reference).
- Respect `CLAUDE.md`: no em dashes, no trailing periods in UI copy.

## Phases (do in order, smallest-risk first)

### Phase 1 — De-dupe & consolidate icons
- Delete `features/guests/hooks/use-dynamic-page-size.ts` (re-export shim); repoint its
  importers to `@/hooks/use-dynamic-page-size`.
- Merge `components/ui/icons/` + `components/icons/` into a single `components/icons/`.
  Update imports.

### Phase 2 — Give every feature a public API barrel
- Add a root `index.ts` to the 7 features missing one: `ai-chat`, `budget`, `confirmation`,
  `dashboard`, `guests`, `seating`, `templates`.
- Each barrel **explicitly** re-exports the feature's intended public surface (components,
  types, and — kept separate — server queries/actions). Match the auth barrel's
  server/client separation. No blind `export *` across the server boundary.
- Migrate app-router pages to import from the feature root (`@/features/guests`) instead of
  deep paths, where safe for the server/client split.

### Phase 3 — Relocate app-level components out of `components/`
Move each domain-coupled component to its owner; update imports:

| From `components/` | To |
| --- | --- |
| `login-form`, `google-login-button` | `features/auth/components/` |
| `onboarding` | `features/events/components/` |
| `homepage-client` (1105 LOC) | `features/landing/components/` (new feature) or route-local `app/(main)/[locale]/_components/` |
| `pie-chart` | `features/dashboard/components/` |
| `app-sidebar`, `app-top-bar`, `mobile-bottom-nav`, `layout-content-wrapper`, `nav-main`, `nav-events`, `nav-secondary` | `components/layout/` (app shell grouping) |
| `feature-layout/` | keep, or nest under `components/layout/` |

After this, `components/` should hold only: `ui/` (shadcn primitives), `icons/`,
`layout/`, and truly-generic shared bits (`card-container`, `language-switcher`).

### Phase 4 — Normalize each feature's internal shape — SKIPPED (investigated, no-op)
Original intent: enforce Zod → `schemas/`, TS-only types → `types.ts`; split mixed files;
fold ad-hoc folders. **On inspection the premise did not hold, so this phase was skipped:**
- All 5 `types.ts` files are already Zod-free — zero violations.
- The non-`z.infer` types found in `schemas/` are overwhelmingly schema-adjacent derived
  types (`(typeof X)[number]`, `EventApp['status']`) that correctly live beside their Zod
  source; moving them would introduce `types ↔ schemas` cross-imports and make things worse.
  Only a handful are genuinely pure (`auth` User/ProfileData, form `*State` types, `schedules`
  GuestStats) and their payoff is marginal.
- `schedules/config` (message body content) and `schedules/constants` (default schedule
  configs) are different concerns; folding them is not an improvement.
Conclusion: the repo already honors the `types`/`schemas` contract. Forcing moves = churn
without benefit, so Phase 4 was intentionally not executed.

### Phase 5 — Consolidate docs — DONE
- Moved `features/schedules/TESTING.md` and `features/schedules/USAGE_EXAMPLES.md` into
  `docs/schedules/`. No code referenced them; code examples inside use `@/` aliases (move-safe).

### Phase 6 (higher-risk) — Adopt `src/` — DONE
- Moved `app/`, `features/`, `components/`, `hooks/`, `lib/`, `i18n/` and `middleware.ts`
  under `src/` (via `git mv`, history preserved). `messages/`, `public/`, `supabase/`, `docs/`
  and all config files stayed at root.
- Config edits: `tsconfig.json` alias (`@/*` → `./src/*`), `next.config.ts` next-intl plugin
  path (`./src/i18n/request.ts`), `components.json` css (`src/app/globals.css`), and the one
  boundary-crossing relative import in `src/i18n/request.ts` (`../messages` → `../../messages`,
  since `messages/` stayed at root). `@/` aliases elsewhere resolve unchanged via tsconfig.
- Verified by `npm run build` (middleware/proxy picked up under `src/`) and `npm run lint`.

## Definition of done

- `npm run lint` and `npm run build` pass on the final branch.
- `components/` contains only shared/generic UI — no domain-coupled components.
- Every feature has an explicit root `index.ts`; app pages import from feature roots.
- No duplicate files, no dangling imports, one icon location.
- `architecture-current.md` updated (or replaced with `architecture.md`) to match the
  new tree.
