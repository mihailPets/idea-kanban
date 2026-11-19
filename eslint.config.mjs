import tseslint from 'typescript-eslint';

export default [
  { ignores: ['dist/**'] },
  ...tseslint.configs.recommended.map((config) => ({
    ...config, files: ['src/**/*.{ts,tsx}', 'tests/**/*.ts', 'playwright.config.ts'],
  })),
];
