import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import cypress from 'eslint-plugin-cypress';

export default tseslint.config(
  { ignores: ['node_modules/**', 'reports/**', 'cypress/screenshots/**', 'cypress/videos/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['scripts/**/*.mjs', 'lib/**/*.mjs'],
    languageOptions: { globals: { process: 'readonly', console: 'readonly' } },
  },
  {
    files: ['cypress/**/*.ts'],
    plugins: { cypress },
    rules: { ...cypress.configs.recommended.rules },
    languageOptions: { globals: cypress.configs.globals?.languageOptions?.globals ?? {} },
  },
);
