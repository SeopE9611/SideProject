import type { ComponentProps } from "react";

import { adminTypography } from "@/components/admin/admin-typography";
import { SemanticBadge } from "@/components/badges/SemanticBadge";
import { cn } from "@/lib/utils";

export type AdminSemanticBadgeProps = ComponentProps<typeof SemanticBadge>;

/**
 * 관리자 상태 표시의 공통 진입점입니다.
 * success(정상/완료), warning(주의/확인), danger(오류/취소), brand(주요 진행),
 * neutral(비활성/보조)을 기본 의미로 사용하고 도메인별 label·tone 결정은 화면에 둡니다.
 */
export function AdminSemanticBadge({ className, ...props }: AdminSemanticBadgeProps) {
  return <SemanticBadge className={cn(className, adminTypography.badgeLabel)} {...props} />;
}
