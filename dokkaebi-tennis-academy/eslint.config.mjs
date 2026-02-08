// dokkaebi-tennis-academy/eslint.config.mjs

import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';

const compat = new FlatCompat();

const eslintConfig = [
  js.configs.recommended,
  {
    ignores: ['.next/**', 'node_modules/**', 'lib/shadcn-plugin.js'],
  },
  ...compat.config({
    extends: ['next/core-web-vitals', 'next/typescript'],
    rules: {
      // 이전에 추가한 규칙들
      'no-empty': 'off',
      'no-unused-vars': 'off',
      'no-unused-expressions': ['error', { allowShortCircuit: true }],
      '@typescript-eslint/no-unused-vars': 'off',
      'react/no-unescaped-entities': 'off',
      'import/no-anonymous-default-export': 'off',

      // ✅ 새로 추가: @typescript-eslint/no-explicit-any 규칙 비활성화
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-expressions': ['error', { allowShortCircuit: true }],
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/incompatible-library': 'off',
      '@next/next/no-img-element': 'off',
    },
  }),
];

export default eslintConfig;
