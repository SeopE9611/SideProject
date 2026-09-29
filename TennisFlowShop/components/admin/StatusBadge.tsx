// 계정 생명주기(active/suspended/deleted) 전용 상태 뱃지입니다.
"use client";
import { AdminSemanticBadge } from "@/components/admin/AdminSemanticBadge";
import { cn } from "@/lib/utils";

type Status = "active" | "suspended" | "deleted";

export default function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const tone = status === "active" ? "success" : status === "suspended" ? "neutral" : "danger";

  const label = status === "active" ? "활성" : status === "suspended" ? "비활성" : "삭제됨";

  return (
    <AdminSemanticBadge
      tone={tone}
      size="sm"
      className={cn("font-medium", className)}
    >
      {label}
    </AdminSemanticBadge>
  );
}
