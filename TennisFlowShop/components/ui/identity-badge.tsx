import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type IdentityBadgeTone = "admin" | "kakao" | "naver" | "email";

type IdentityBadgeProps = {
  tone: IdentityBadgeTone;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
};

const identityToneClass: Record<IdentityBadgeTone, string> = {
  admin: "border-identity-admin/30 bg-identity-admin-muted text-identity-admin-foreground",
  kakao: "border-identity-kakao/30 bg-identity-kakao-muted text-identity-kakao-foreground",
  naver: "border-identity-naver/30 bg-identity-naver-muted text-identity-naver-foreground",
  email: "border-border bg-secondary text-secondary-foreground",
};

export function IdentityBadge({ tone, children, className, icon }: IdentityBadgeProps) {
  return (
    <Badge
      variant="secondary"
      wrap="normal"
      className={cn(
        "min-h-6 gap-1 border px-2 text-ui-label font-medium shadow-none",
        identityToneClass[tone],
        className,
      )}
    >
      {icon}
      {children}
    </Badge>
  );
}
