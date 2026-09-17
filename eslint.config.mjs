import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      // Agent worktrees are whole checkouts of this repo living inside it,
      // build output and dependencies included. Without this, `npm run lint`
      // reports thousands of errors from vendored code in a sibling checkout
      // and is useless for finding anything in src/.
      '.claude/**',
    ],
  },
];

export default eslintConfig;
