import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  //검사 제외 대상 설정
  {
    ignores: ['.next/**', 'node_modules/**', 'out/**', 'public/**'],
  },
  // Next.js 및 TypeScript 설정 로드
  ...compat.config({
    extends: ['next/core-web-vitals', 'next/typescript'],
  }),
  // 추가 규칙 (필요 시)
  {
    rules: {
      // 여기에 커스텀 규칙을 추가
    },
  },
];

export default eslintConfig;
