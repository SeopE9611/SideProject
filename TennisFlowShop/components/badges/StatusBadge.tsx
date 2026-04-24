"use client";

import { badgeVariants } from "@/components/ui/badge";
import {
  usedBadgeMeta,
  type BadgeSurface,
  type UsedBadgeKind,
} from "@/lib/badge-style";
import { cn } from "@/lib/utils";

type Props = {
  kind: UsedBadgeKind; // 'rental' | 'condition'
  state: string; // 상태코드(e.g. 'available', 'A' 등)
  className?: string;
  as?: "span" | "div";
  surface?: BadgeSurface;
};

export default function StatusBadge({
  kind,
  state,
  className = "",
  as = "span",
  surface = "inline",
}: Props) {
  const Comp = as;
  const meta = usedBadgeMeta(kind, state, surface);

  return (
    <Comp
      className={cn(
        badgeVariants({ variant: "neutral" }),
        "rounded px-2 py-0.5 text-xs font-medium shadow-sm",
        meta.className,
        className,
      )}
    >
      {meta.label}
    </Comp>
  );
}
