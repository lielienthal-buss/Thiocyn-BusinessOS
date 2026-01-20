import globals from 'globals';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactRecommended from 'eslint-plugin-react/configs/recommended.js';
import prettierConfig from 'eslint-config-prettier';

export default [
  {
    ignores: ['dist/', 'node_modules/', 'vite.config.ts', '.eslintrc.cjs', 'eslint.config.js'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ...reactRecommended,
    files: ['**/*.{ts,tsx}'],
  },
  prettierConfig,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
];
