"use client";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ReactNode } from "react";

interface ThemeProviderProps {
  children: React.ReactNode;             // Provider 안에 포함된 내용들
  attribute?: 'class' | 'style';         // 테마를 적용할 HTML 속성
  defaultTheme?: string;                 // 기본 테마: 'light', 'dark', 'system'
  enableSystem?: boolean;                // 시스템 테마 감지 여부
  disableTransitionOnChange?: boolean;   // 테마 바꿀 때 애니메이션 제거 여부
  storageKey?: string;                   // localStorage에 저장할 key 이름
  themes?: string[];                     // 사용할 커스텀 테마 목록
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
