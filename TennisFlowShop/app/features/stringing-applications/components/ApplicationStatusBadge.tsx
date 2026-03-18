"use client";

import { Badge } from "@/components/ui/badge";
import {
  badgeBase,
  badgeSizeSm,
  getApplicationStatusBadgeSpec,
} from "@/lib/badge-style";
import { cn } from "@/lib/utils";

interface Props {
  status: string;
}

export default function ApplicationStatusBadge({ status }: Props) {
  const spec = getApplicationStatusBadgeSpec(status);

  return (
    <Badge variant={spec.variant} className={cn(badgeBase, badgeSizeSm)}>
      {status}
    </Badge>
  );
}
