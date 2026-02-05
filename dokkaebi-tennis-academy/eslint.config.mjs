// dokkaebi-tennis-academy/eslint.config.mjs

import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';

const compat = new FlatCompat();

const eslintConfig = [
  js.configs.recommended,
  {
    ignores: ['.next/**', 'node_modules/**'],
  },
  ...compat.config({
    extends: ['next/core-web-vitals', 'next/typescript'],
    rules: {
      // 기본 ESLint 규칙 OFF
      'no-empty': 'off',
      'no-unused-vars': 'off',
      
      // TypeScript 환경의 'no-unused-vars' 규칙 OFF
      '@typescript-eslint/no-unused-vars': 'off',

      // `'` 사용 시 발생하는 오류 비활성화
      'react/no-unescaped-entities': 'off',

      // React Hook 의존성 경고 비활성화
      'react-hooks/exhaustive-deps': 'off',

      // 익명 기본 내보내기 경고 비활성화 
      'import/no-anonymous-default-export': 'off',
    },
  }),
];

export default eslintConfig;
