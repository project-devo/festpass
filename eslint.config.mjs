import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', 'web/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  // k6 scripts run inside k6, not Node: tell ESLint about k6's globals
  {
    files: ['api/loadtest/**/*.js'],
    languageOptions: {
      globals: { __ENV: 'readonly', __VU: 'readonly', open: 'readonly', console: 'readonly' },
    },
  },
);
