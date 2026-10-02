#!/usr/bin/env bash
# The only way migrations should reach production: `npm run db:push`.
#
# Refuses unless the push comes from an up-to-date main with no uncommitted
# migration files, then refuses again on any drift, and only then runs
# `supabase db push`. A migration pushed from a branch that never merges leaves
# production with a version main has no file for, and every later push from
# main fails on it - that is how 20260923000000/1 sat unmerged for weeks.
#
# Extra arguments go to `supabase db push` (e.g. `npm run db:push -- --dry-run`).

set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

fail() {
  echo "db:push: $*" >&2
  exit 1
}

branch="$(git symbolic-ref --short -q HEAD || true)"
[[ "$branch" == "main" ]] || fail "push from main, not '${branch:-a detached HEAD}'. Merge the migration first."

# Only supabase/migrations: the CLI rewrites files under supabase/.temp on every
# run, so a whole-tree check would never pass.
[[ -z "$(git status --porcelain -- supabase/migrations)" ]] ||
  fail "supabase/migrations has uncommitted or untracked files. Commit and merge them, or remove them."

git fetch --quiet origin main
[[ "$(git rev-parse HEAD)" == "$(git rev-parse origin/main)" ]] ||
  fail "local main is not level with origin/main. Pull (or push) first."

node scripts/check-migration-drift.mjs --allow-pending ||
  fail "migration drift - fix it before pushing (see above)."

npx supabase db push "$@"
