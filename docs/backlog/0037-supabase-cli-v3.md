# The repo is pinned to Supabase CLI v2, and v3 needs more than a config rename

Status: open
Area: database / tooling
Related: `scripts/db-push.sh`, `scripts/check-migration-drift.mjs`,
`.github/workflows/migration-drift.yml`, `supabase/config.toml`

## The problem

Supabase CLI v3.0.0 shipped on 2026-11-02 and became npm's `latest`. Until then
`supabase` was not a dependency of this repo, so every `npx supabase ...` (the
`db:push` and `db:drift` scripts, and the commands in `CLAUDE.md`) fetched whatever was
newest. Under v3 every one of them stopped at config load:

```
[inbucket] in supabase/config.toml is no longer supported
```

The fix taken for now (2026-11-07) is a pin, not an upgrade: `supabase` is an exact
devDependency at 2.119.0, the same version the Migration Drift workflow already pins with
`supabase/setup-cli`. `npx supabase` resolves to it once `npm install` has run.
`scripts/db-push.sh` also passes `--linked` explicitly now (see below).

## Why not rename the section and move to v3

Renaming `[inbucket]` to `[local_smtp]` is the documented first step, and v2.108.0 and
later already read `[local_smtp]`. It was not done because:

- **v3 makes `db push` target the local stack when no target is given.** `db-push.sh`
  ran a bare `npx supabase db push`. Under v3 that pushes to local, prints success,
  and production gets nothing. The same goes for `migration repair` and `migration list`
  (`CLAUDE.md`'s repair recipe has no target flag). `--linked` still works in v3 but is
  deprecated in favour of `--remote`.
- **v3 changes confirmation.** Every hosted change asks, the default answer is No, a `y`
  piped on stdin no longer counts, and unattended runs fail unless `--yes` is passed.
- **The Homebrew CLI on the dev machine was 2.95.4**, older than 2.108.0, so renaming the
  section would have broken the CLI that runs the local stack.
- v3 also lets flags, shell env and env files override `config.toml`, renames local
  containers after the folder when `project_id` is missing (it is set here), and removes
  `INBUCKET_URL` in favour of `MAILPIT_URL`.

## What done looks like

1. Every Supabase CLI in use (Homebrew, devDependency, CI pin) is at least 2.108.0; then
   rename `[inbucket]` to `[local_smtp]` (the keys inside stay the same).
2. Every script and documented command says its target: `--remote` for production in
   `db-push.sh`, `check-migration-drift.mjs` and the `CLAUDE.md` repair recipe, and
   `--yes` where a script runs unattended (CI).
3. Bump the devDependency and the workflow's `version:` together, then run
   `npm run db:push -- --dry-run` and `npm run db:drift` to confirm they still reach
   `kululu-prod`, and `db reset` locally.

## Checked and found false

- "The seed failure under `db reset` comes from the CLI version." It doesn't. 2.95.4 loads
  each seed file as one pgx batch with the statement cache on, which prepares every
  statement before running any. That is why `schedule-results.sql` now does its temp-table
  work inside one `do` block. The pin did not fix it and was not needed for it.
