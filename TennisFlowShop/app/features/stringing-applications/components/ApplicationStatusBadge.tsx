"use client";

import { Badge } from "@/components/ui/badge";
import { badgeBase, badgeSizeSm, getApplicationStatusBadgeSpec } from "@/lib/badge-style";
import { getCommonApplicationStatusLabel } from "@/lib/status-labels/base";
import { cn } from "@/lib/utils";

interface Props {
  status: string;
}

export default function ApplicationStatusBadge({ status }: Props) {
  const spec = getApplicationStatusBadgeSpec(status);
  const label = getCommonApplicationStatusLabel(status) ?? status;

  return (
    <Badge variant={spec.variant} className={cn(badgeBase, badgeSizeSm)}>
      {label}
    </Badge>
  );
}
