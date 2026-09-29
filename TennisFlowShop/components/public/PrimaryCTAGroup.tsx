import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PrimaryCTAGroupProps = {
  primary: ReactNode;
  secondary?: ReactNode;
  tertiary?: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
};

export function PrimaryCTAGroup({
  primary,
  secondary,
  tertiary,
  align = "left",
  className,
}: PrimaryCTAGroupProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-2 bp-md:w-auto bp-md:flex-row bp-md:items-center",
        align === "right" && "bp-md:justify-end",
        align === "center" && "bp-md:justify-center",
        className,
      )}
    >
      <div className="[&>*]:w-full bp-md:[&>*]:w-auto">{primary}</div>
      {secondary && <div className="[&>*]:w-full bp-md:[&>*]:w-auto">{secondary}</div>}
      {tertiary && <div className="[&>*]:w-full bp-md:[&>*]:w-auto">{tertiary}</div>}
    </div>
  );
}
