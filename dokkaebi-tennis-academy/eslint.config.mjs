import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';

const compat = new FlatCompat();

const eslintConfig = [
  js.configs.recommended,
  {
    ignores: ['.next/**', 'node_modules/**'],
  },
  ...compat.config({
    extends: ['next/core-web-vitals'],
    rules: {
      'no-empty': 'off',
      'no-unused-vars': 'off',
      // "import/no-anonymous-default-export": "off"
    },
  }),
];

export default eslintConfig;
