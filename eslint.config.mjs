import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    '.vercel/**',
    'out/**',
    'build/**',
    'storybook-static/**',
    'apps/docs/build/**',
    'apps/docs/.docusaurus/**',
    'packages/ui/dist/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
