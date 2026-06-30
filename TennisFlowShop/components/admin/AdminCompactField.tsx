import type { ReactNode } from "react";

import { adminTypography } from "@/components/admin/admin-typography";
import { cn } from "@/lib/utils";

type AdminCompactFieldProps = {
  label: ReactNode;
  value?: ReactNode;
  emptyValue?: ReactNode;
  className?: string;
  valueClassName?: string;
};

export default function AdminCompactField({
  label,
  value,
  emptyValue = "미등록",
  className,
  valueClassName,
}: AdminCompactFieldProps) {
  const isEmpty = value === null || value === undefined || value === "";

  return (
    <div
      className={cn(
        "min-w-0 rounded-lg border border-border/60 bg-background/70 px-3 py-2",
        className,
      )}
    >
      <p className={cn("mb-1", adminTypography.metaMuted)}>{label}</p>
      <div
        className={cn(
          "min-w-0 break-words text-ui-body-sm font-medium text-foreground",
          isEmpty && "font-normal text-muted-foreground",
          valueClassName,
        )}
      >
        {isEmpty ? emptyValue : value}
      </div>
    </div>
  );
}
