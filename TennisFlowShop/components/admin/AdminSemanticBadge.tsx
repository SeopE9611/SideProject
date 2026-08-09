import type { ComponentProps } from "react";

import { adminTypography } from "@/components/admin/admin-typography";
import { SemanticBadge } from "@/components/badges/SemanticBadge";
import { cn } from "@/lib/utils";

export type AdminSemanticBadgeProps = ComponentProps<typeof SemanticBadge>;

export function AdminSemanticBadge({ className, ...props }: AdminSemanticBadgeProps) {
  return <SemanticBadge className={cn(className, adminTypography.badgeLabel)} {...props} />;
}
