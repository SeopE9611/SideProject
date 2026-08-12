import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AdminPageShellProps = {
  children: ReactNode;
  className?: string;
  variant?: "default" | "wide" | "narrow";
};

const widthByVariant = {
  // 상세·정보 화면의 기본 읽기 폭
  default: "max-w-[1280px]",
  // 데이터 테이블 중심 목록 화면의 가로 정보 밀도를 보존하는 폭
  wide: "max-w-[1560px]",
  // 집중 입력 및 간단한 단일 열 폼을 위한 폭
  narrow: "max-w-4xl",
} as const;

export default function AdminPageShell({
  children,
  className,
  variant = "default",
}: AdminPageShellProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-3 py-4 2xl:px-5 2xl:py-5",
        widthByVariant[variant],
        className,
      )}
    >
      {children}
    </div>
  );
}
