import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AdminPageShellProps = {
  children: ReactNode;
  className?: string;
  variant?: "default" | "wide" | "narrow";
};

const widthByVariant = {
  default: "max-w-[1280px]",
  wide: "max-w-[1560px]",
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
        "mx-auto w-full px-3 py-4 bp-sm:px-4 bp-md:px-3 lg:px-5 lg:py-5",
        widthByVariant[variant],
        className,
      )}
    >
      {children}
    </div>
  );
}
