import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type MypageNextActionProps = {
  children: ReactNode;
  /** 라벨 텍스트 (기본: "다음 할 일") */
  label?: ReactNode;
  className?: string;
};

/**
 * 마이페이지 목록/상세 공통 "다음 할 일" 안내 문구.
 * 사용자가 지금 무엇을 해야 하는지 한 줄로 안내합니다. (UI 전용)
 */
export default function MypageNextAction({
  children,
  label = "다음 할 일",
  className,
}: MypageNextActionProps) {
  return (
    <p className={cn("break-keep text-ui-label leading-relaxed text-muted-foreground", className)}>
      <span className="font-semibold text-foreground">{label}</span> · {children}
    </p>
  );
}
