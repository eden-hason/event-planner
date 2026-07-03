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

### Phase 4 — Normalize each feature's internal shape
- Enforce the `CLAUDE.md` contract per feature: Zod → `schemas/`, TS-only types → `types.ts`.
  Split any file that mixes both.
- Fold ad-hoc folders into the convention: `schedules/config` + `schedules/constants` →
  a single `schedules/config/` (or `constants/`); `templates/data` + `templates/designs`
  may stay (they are genuine domain content) but document why in a short feature-level README.

### Phase 5 — Consolidate docs
- Move `features/schedules/TESTING.md` and `features/schedules/USAGE_EXAMPLES.md` into
  `docs/schedules/`. Keep code-adjacent only what is truly code-adjacent.

### Phase 6 (optional, higher-risk) — Adopt `src/`
- Move `app/`, `features/`, `components/`, `hooks/`, `lib/`, `i18n/` under `src/`.
- Update `tsconfig.json` paths (`@/*` → `./src/*`), `components.json` aliases, and the
  next-intl plugin path in `next.config.ts`. Verify `middleware.ts` still resolves.
- Do this **last and alone** — it touches every import indirectly via the alias, so the
  build is the safety net.

## Definition of done

- `npm run lint` and `npm run build` pass on the final branch.
- `components/` contains only shared/generic UI — no domain-coupled components.
- Every feature has an explicit root `index.ts`; app pages import from feature roots.
- No duplicate files, no dangling imports, one icon location.
- `architecture-current.md` updated (or replaced with `architecture.md`) to match the
  new tree.
