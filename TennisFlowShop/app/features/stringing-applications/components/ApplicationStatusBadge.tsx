"use client";

import { SemanticBadge } from "@/components/badges/SemanticBadge";
import { getApplicationStatusBadgeSpec } from "@/lib/badge-style";
import { getCommonApplicationStatusLabel } from "@/lib/status-labels/base";

interface Props {
  status: string;
}

export default function ApplicationStatusBadge({ status }: Props) {
  const spec = getApplicationStatusBadgeSpec(status);
  const label = getCommonApplicationStatusLabel(status) ?? status;

  return (
    <SemanticBadge tone={spec.tone} size="sm">
      {label}
    </SemanticBadge>
  );
}
