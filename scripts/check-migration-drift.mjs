#!/usr/bin/env node
// Compares supabase/migrations against what production has recorded, and exits
// non-zero on drift. Shared by `npm run db:push` (before it pushes) and the
// Migration Drift workflow (on a schedule), so both read drift the same way.
//
//   remote-only: production recorded a version that has no file here. Always
//     drift. Either it was pushed from a branch that never merged (merge its
//     file into main), or it was applied under a version that matches no file
//     (fix the bookkeeping with `migration repair` - see CLAUDE.md).
//   local-only: a file production has not applied yet. Drift for the scheduled
//     check (main has something nobody pushed), but exactly what `db push` is
//     about to apply, so the push guard passes `--allow-pending`.
//
// Needs a linked project: `npx supabase link` locally, `supabase link` in CI.
// SUPABASE_CLI overrides the command (CI uses the installed `supabase` binary).

import { execSync } from 'node:child_process';

const allowPending = process.argv.includes('--allow-pending');
const cli = process.env.SUPABASE_CLI ?? 'npx supabase';

let migrations;
try {
  const out = execSync(`${cli} migration list --linked --output-format json`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  ({ migrations } = JSON.parse(out));
} catch (err) {
  console.error('check-migration-drift: could not read the migration list.');
  console.error(err instanceof Error ? err.message : err);
  process.exit(2);
}

const remoteOnly = migrations.filter((m) => m.remote && !m.local);
const localOnly = migrations.filter((m) => m.local && !m.remote);

const list = (rows, key) => rows.map((m) => `  - ${m[key]}`).join('\n');

if (remoteOnly.length) {
  console.error(
    `Production has ${remoteOnly.length} migration(s) with no file in supabase/migrations:\n` +
      `${list(remoteOnly, 'remote')}\n\n` +
      'Find the branch that has the file (`git log --all -- supabase/migrations/<version>*`)\n' +
      'and merge it into main unchanged. If no branch has it, it was applied under the\n' +
      'wrong version - see "Database Migrations" in CLAUDE.md for `migration repair`.',
  );
}

if (localOnly.length) {
  const header = allowPending
    ? 'Pending, will be applied by this push:'
    : `main has ${localOnly.length} migration(s) production has not applied - push them with \`npm run db:push\`:`;
  (allowPending ? console.log : console.error)(`${header}\n${list(localOnly, 'local')}`);
}

const drift = remoteOnly.length > 0 || (!allowPending && localOnly.length > 0);
if (!drift && !localOnly.length) console.log('No migration drift.');
process.exit(drift ? 1 : 0);
