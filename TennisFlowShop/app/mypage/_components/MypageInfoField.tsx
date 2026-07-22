import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type MypageInfoFieldProps = {
  label: ReactNode;
  value?: ReactNode;
  fallback?: ReactNode;
  className?: string;
  valueClassName?: string;
};

export default function MypageInfoField({
  label,
  value,
  fallback = "미등록",
  className,
  valueClassName,
}: MypageInfoFieldProps) {
  const isEmpty = value === null || value === undefined || value === "";

  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      <p className="text-ui-label font-medium text-muted-foreground">{label}</p>
      <div
        className={cn(
          "min-w-0 break-words text-ui-body-sm",
          isEmpty ? "font-normal text-muted-foreground" : "font-ui-medium text-foreground",
          valueClassName,
        )}
      >
        {isEmpty ? fallback : value}
      </div>
    </div>
  );
}
