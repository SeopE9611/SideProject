import { fixupConfigRules } from "@eslint/compat";
import nextConfig from "eslint-config-next";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
  {
    // 검사 제외 대상
    ignores: [".next/**", "node_modules/**", "dist/**", "out/**"],
  },
  // Next.js 설정을 Flat Config에 맞게 보정하여 로드
  ...fixupConfigRules(nextConfig.configs["core-web-vitals"]),
  {
    // TypeScript 및 React 관련 설정 수동 보완
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      // 여기에 추가하고 싶은 규칙 작성
    },
  },
];
