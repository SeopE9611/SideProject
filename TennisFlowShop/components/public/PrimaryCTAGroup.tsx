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
        "flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center",
        align === "right" && "sm:justify-end",
        align === "center" && "sm:justify-center",
        className,
      )}
    >
      <div className="[&>*]:w-full sm:[&>*]:w-auto">{primary}</div>
      {secondary && (
        <div className="[&>*]:w-full sm:[&>*]:w-auto">{secondary}</div>
      )}
      {tertiary && (
        <div className="[&>*]:w-full sm:[&>*]:w-auto">{tertiary}</div>
      )}
    </div>
  );
}
